export const uniformPaneClass = `
class UniformUIController {
  pane = new Pane({ title: "Shader Uniforms" });
  enablePresets = false;
  trueInitialState = {};
  uniformBindings = {}; // Track individual uniform bindings for cleanup
  
  constructor(persistent, enablePresets) {
    this.persistent = persistent;
    this.enablePresets = enablePresets;

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