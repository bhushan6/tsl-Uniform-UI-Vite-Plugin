export const uniformPaneClass = `
class UniformUIController {
  pane = new Pane({ title: "Shader Uniforms" });
  enablePresets = false;
  trueInitialState = {};
  uniformBindings = {}; // Track individual uniform bindings for cleanup
  draggable = false;
  
  constructor(persistent, enablePresets, draggable = false) {
    this.persistent = persistent;
    this.enablePresets = enablePresets;
    this.draggable = draggable;

    if (this.persistent) {
      const savedState = localStorage.getItem("threeUniformGuiPluginState");

      console.log(this.pane)

      this.pane.on('fold', () => {
        this.uniformSaveDebounced()
      })

      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          this.initialUniformState = parsedState;
          this.currentState = this.initialUniformState
        } catch (err) {
          console.error(err);
        }
      }
    }

    if (this.enablePresets) {
      const presets = localStorage.getItem("threeUniformGuiPluginPresets");
      if(presets) {
        this.presets = JSON.parse(presets)
      }
    }

    if (this.draggable) {
      this.setupDraggable();
    }
  }

  setupDraggable() {
    const paneElement = this.pane.element;
    const containerElement = paneElement.parentElement;
    
    // Make container positioned for dragging
    containerElement.style.position = 'fixed';
    containerElement.style.zIndex = '1000';
    
    // Get the title bar element (first child with class tp-rotv_t or the title button)
    const titleBar = paneElement.querySelector('.tp-rotv_b');
    
    if (!titleBar) {
      console.warn('[three-uniform-gui] Could not find title bar for draggable panel');
      return;
    }
    
    // Style the title bar to indicate it's draggable
    titleBar.style.cursor = 'grab';
    
    let isDragging = false;
    let hasDragged = false; // Track if actual dragging occurred (not just a click)
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    
    const onMouseDown = (e) => {
      // Only start drag on left mouse button and if clicking on title area (not the fold button)
      if (e.button !== 0) return;
      if (e.target.closest('.tp-rotv_m')) return; // Ignore fold button clicks
      
      isDragging = true;
      hasDragged = false; // Reset drag flag
      titleBar.style.cursor = 'grabbing';
      
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = containerElement.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      
      // Prevent text selection during drag
      e.preventDefault();
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    
    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Only consider it a drag if moved more than 3px (prevents accidental drags on clicks)
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasDragged = true;
      }
      
      containerElement.style.left = (initialLeft + deltaX) + 'px';
      containerElement.style.top = (initialTop + deltaY) + 'px';
      containerElement.style.right = 'auto';
    };
    
    const onMouseUp = () => {
      isDragging = false;
      titleBar.style.cursor = 'grab';
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Save position if persistent
      if (this.persistent) {
        const rect = containerElement.getBoundingClientRect();
        localStorage.setItem('threeUniformGuiPluginPosition', JSON.stringify({
          left: rect.left,
          top: rect.top
        }));
      }
    };
    
    // Prevent click event from firing after a drag (which would toggle the panel)
    const onClickCapture = (e) => {
      if (hasDragged) {
        e.stopPropagation();
        e.preventDefault();
        hasDragged = false;
      }
    };
    
    titleBar.addEventListener('mousedown', onMouseDown);
    titleBar.addEventListener('click', onClickCapture, true);
    
    // Restore saved position if persistent
    if (this.persistent) {
      const savedPosition = localStorage.getItem('threeUniformGuiPluginPosition');
      if (savedPosition) {
        try {
          const pos = JSON.parse(savedPosition);
          containerElement.style.left = pos.left + 'px';
          containerElement.style.top = pos.top + 'px';
          containerElement.style.right = 'auto';
        } catch (err) {
          console.warn('[three-uniform-gui] Could not restore panel position');
        }
      }
    }
  }

  captureInitialValue(folderName, uniformName, uniformObject) {
    if (!this.trueInitialState[folderName]) {
      this.trueInitialState[folderName] = {};
    }
    // Capture only once
    if (this.trueInitialState[folderName][uniformName]) {
      return;
    }

    const value = uniformObject.value;
    if (value?.isColor) {
      this.trueInitialState[folderName][uniformName] = JSON.stringify({
        r: value.r,
        g: value.g,
        b: value.b,
      });
    } else if (value?.isVector2 || value?.isVector3 || value?.isVector4) {
      this.trueInitialState[folderName][uniformName] = { ...value };
    } else {
      this.trueInitialState[folderName][uniformName] = value;
    }
  }

  // Clean up individual uniform binding
  disposeUniformBinding(folderName, uniformName) {
  console.log(folderName, uniformName, this.uniformBindings, "disposing binding")
    if (this.uniformBindings[folderName]?.[uniformName]) {
      try {
        this.uniformBindings[folderName][uniformName].dispose();
      } catch (err) {
        console.warn('Failed to dispose binding:', err);
      }
      delete this.uniformBindings[folderName][uniformName];
    }
  }

  // Store uniform binding reference
  storeUniformBinding(folderName, uniformName, binding) {
    if (!this.uniformBindings[folderName]) {
      this.uniformBindings[folderName] = {};
    }
    this.uniformBindings[folderName][uniformName] = binding;
  }

  // Clean up all bindings for a folder
  disposeFolderBindings(folderName) {
    if (this.uniformBindings[folderName]) {
      Object.keys(this.uniformBindings[folderName]).forEach(uniformName => {
        try {
          this.uniformBindings[folderName][uniformName].dispose();
        } catch (err) {
          console.warn('Failed to dispose binding:', err);
        }
      });
      delete this.uniformBindings[folderName];
    }
  }

  setupUI(){
    this.setupActionButtons()
    if (this.enablePresets) {
      this.setupPresets();
    }
  }

  presets = {}

  setupPresets() {
    const presetFolder = this.pane.addFolder({
      title: 'Presets',
      expanded: false
    })

    const PRESETPARAMS = {
      newPresetName: "",
      currentPreset: "",
    }

    presetFolder.addBinding(PRESETPARAMS, "newPresetName", {
      label: "Name"
    })

    const btn = presetFolder.addButton({
      title: 'Create Preset',
    });

    const createPresetDropDown = () => {
      const options = Object.keys(this.presets).reduce((acc, value) => {
        acc[value] = value
        return acc
      }, {none: ""})

      const presetDropDown = presetFolder.addBinding(PRESETPARAMS, "currentPreset", {
        options: options
      }).on("change", (e) => {
        if(e.value.trim() === ""){
          this.undoRedoInProgress = true;
          this.currentState && this.applyConfigs(this.currentState)
          this.undoRedoInProgress = false;
          return;
        }
        const configs = this.presets[e.value]
        this.undoRedoInProgress = true;
        configs && this.applyConfigs(configs)
        this.undoRedoInProgress = false;
      })
      return presetDropDown
    }

    let presetOptions = createPresetDropDown()


    btn.on('click', () => {
      const newPresetName = PRESETPARAMS.newPresetName;
      if(newPresetName.trim() === "") return;
      const newPreset = this.uniformStateSerializer();
      delete newPreset.Presets
      this.presets[newPresetName] = newPreset;
      presetOptions.dispose()
      presetOptions = createPresetDropDown()
      localStorage.setItem("threeUniformGuiPluginPresets", JSON.stringify(this.presets));
      PRESETPARAMS.newPresetName = ""
      this.pane.refresh()
    });
  }

  uniformStateSerializer = () => {
    const paneState = this.pane.exportState();
    const extractValues = (children, accumulator) => {
      return children.reduce((acc, value) => {
        if (value.label) {
          if (value.binding.value?.isColor) {
            const color = {
              r: value.binding.value.r,
              g: value.binding.value.g,
              b: value.binding.value.b,
            };
            acc[value.label] = JSON.stringify(color);
          } else {
            acc[value.label] = value.binding.value;
          }
        }
        if (value.children) {
          const childObject = extractValues(value.children, {});
          childObject['__expanded'] = value.expanded
          acc[value.title] = childObject;
        }
        return acc;
      }, accumulator);
    };
    const state = extractValues(paneState.children, {
      root: {
        __expanded : paneState.expanded
      }
    })
    delete state.Presets
    return state;
  };

  applyConfigs = (configs) => {
    const paneState = this.pane.exportState();
    const applyValues = (children, params) => {
      children.forEach(child => {
        if(child.title !== 'Presets'){
          if(child.binding){
            const value = params[child.label]
            if(child.binding.value?.isColor){
              const colorValue = JSON.parse(value)
              child.binding.value.r = colorValue.r
              child.binding.value.g = colorValue.g
              child.binding.value.b = colorValue.b
            }else{
              child.binding.value = value
            }
          }else if(child.children){
            const childParams = params[child.title] || {}
            if(childParams['__expanded'] !== undefined) {
              child.expanded = childParams['__expanded']
            }
            applyValues(child.children, childParams)
          }
        }
      })
    }
    this.pane.expanded = configs.root.__expanded === true ? true : configs.root.__expanded === false ? false : paneState.expanded
    applyValues(paneState.children, configs)
    this.pane.importState(paneState);
  }

  saveTimerId = null;

  undoStack = [];
  redoStack = [];

  actionController = null

  refreshActionButtonsController = () => {
    let i = 0
    this.actionController.cellToApiMap_.forEach((api) => {
      if(i === 1){
        api.disabled = this.undoStack.length < 1
      }else if(i === 2){
        api.disabled = this.redoStack.length < 1
      }
      i += 1;
    })
  }

  undoRedoInProgress = false

  undo = () => {
    this.undoRedoInProgress = true
    const last = this.undoStack.pop();
    const uniformState = this.uniformStateSerializer();
    this.applyConfigs(last)
    this.redoStack.push(uniformState);
    this.refreshActionButtonsController()
    this.undoRedoInProgress = false
  };

  redo = () => {
    this.undoRedoInProgress = true
    const last = this.redoStack.pop();
    const uniformState = this.uniformStateSerializer();
    this.applyConfigs(last)
    this.undoStack.push(uniformState);
    this.refreshActionButtonsController()
    this.undoRedoInProgress = false
  };

  reset = () => {
    this.undoRedoInProgress = true;
    this.applyConfigs(this.trueInitialState);
    this.undoRedoInProgress = false;
  }

  copyTimeout = null;

  copy = (api) => {
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    api.title = "Coping...";
    this.pane.refresh();

    const uniformState = this.uniformStateSerializer();
    navigator.clipboard.writeText(JSON.stringify(uniformState));
    api.title = "Copied!!";
    this.pane.refresh();

    this.copyTimeout = setTimeout(() => {
      api.title = "Copy";
      this.pane.refresh();
    }, 1000);
  }


  setupActionButtons = () => {
    this.actionController = this.pane.addBlade({
      view: 'buttongrid',
      size: [4, 1],
      cells: (x, y) => ({
        title: [
          ['Copy', 'Undo', 'Redo', 'Reset'],
        ][y][x],
      })
    }).on('click', (ev) => {
      const buttonApi = Array.from(this.actionController.cellToApiMap_.values())[ev.index[0]];
      if(ev.index[0] === 0){
        this.copy(buttonApi);
      } else if(ev.index[0] === 1){
        this.undo();
      } else if(ev.index[0] === 2){
        this.redo()
      } else {
        this.reset()
      }
    });

    this.refreshActionButtonsController()
  }

  uniformSaveDebounced = () => {
    this.saveTimerId && clearTimeout(this.saveTimerId);
    if(this.undoRedoInProgress){
      const uniformState = this.uniformStateSerializer();
      this.persistent &&
        localStorage.setItem(
          "threeUniformGuiPluginState",
          JSON.stringify(uniformState)
        );
      return;
    }
    this.saveTimerId = setTimeout(() => {
      const uniformState = this.uniformStateSerializer();
      if(this.currentState){
        this.undoStack.push({...this.currentState});
      }
      this.currentState = uniformState
      this.refreshActionButtonsController()
      this.persistent &&
        localStorage.setItem(
          "threeUniformGuiPluginState",
          JSON.stringify(uniformState)
        );
      console.log({uniformState})
    }, 500);
  };

  dispose = () => {};
}

`;