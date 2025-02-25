export const uniformPaneClass = `
class UniformUIController {
  pane = new Pane({ title: "Shader Uniforms" });

  constructor(persistent) {
    this.persistent = persistent;
    
    if (this.persistent) {
      const savedState = localStorage.getItem("threeUniformGuiPluginState");
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          this.initialUniformState = parsedState;
          this.currentState = this.initialUniformState
        } catch (err) {
          console.error(err);
          const uniformState = this.uniformStateSerializer();
          this.currentState = uniformState
        }
      }
    }else{
      const uniformState = this.uniformStateSerializer();
      this.currentState = uniformState
    }

    const presets = localStorage.getItem("threeUniformGuiPluginPresets");
    if(presets) {
      this.presets = JSON.parse(presets)
    }
  }

  setupUI(){
    this.setupCopyConfigButton();
    this.setupUndoRedoButtons()
    this.setupPresets();
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

  setupCopyConfigButton() {
    const btn = this.pane.addButton({
      title: "Copy configs",
    });

    let t;

    btn.on("click", () => {
      if (t) clearTimeout(t);
      btn.title = "Coping...";
      this.pane.refresh();

      const uniformState = this.uniformStateSerializer();
      navigator.clipboard.writeText(JSON.stringify(uniformState));
      btn.title = "Copied!!";
      this.pane.refresh();

      t = setTimeout(() => {
        btn.title = "Copy configs";
        this.pane.refresh();
      }, 1000);
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
          acc[value.title] = extractValues(value.children, {});
        }
        return acc;
      }, accumulator);
    };
    const state = extractValues(paneState.children, {})
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
            applyValues(child.children, params[child.title])
          }
        }
      })
    }
    applyValues(paneState.children, configs)
    this.pane.importState(paneState);
  }

  saveTimerId = null;

  undoStack = [];
  redoStack = [];

  undoRedoController = null 
  
  refreshUndoRedoController = () => {
    let i = 0
    this.undoRedoController.cellToApiMap_.forEach((api) => {
      if(i === 0){
        api.disabled = this.undoStack.length < 1
      }else{
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
    this.refreshUndoRedoController()
    this.undoRedoInProgress = false
  };

  redo = () => {
    this.undoRedoInProgress = true
    const last = this.redoStack.pop();
    const uniformState = this.uniformStateSerializer();
    this.applyConfigs(last)
    this.undoStack.push(uniformState);
    this.refreshUndoRedoController()
    this.undoRedoInProgress = false
  };
  

  setupUndoRedoButtons = () => {
    this.undoRedoController = this.pane.addBlade({
      view: 'buttongrid',
      size: [2, 1],
      cells: (x, y) => ({
        title: [
          ['Undo', 'Redo'],
        ][y][x],
      })
    }).on('click', (ev) => {
      if(ev.index[0] === 0){
        this.undo();
      }else{
        this.redo()
      }
    });
    
    this.refreshUndoRedoController()
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
        this.undoStack.push(this.currentState);
      }
      this.currentState = uniformState
      this.refreshUndoRedoController()
      this.persistent &&
        localStorage.setItem(
          "threeUniformGuiPluginState",
          JSON.stringify(uniformState)
        );
    }, 500);
  };

  dispose = () => {};
}

`;
