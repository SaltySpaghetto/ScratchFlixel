function loadJS(FILE_URL, async = true) {
  let scriptEle = document.createElement("script");

  scriptEle.setAttribute("src", FILE_URL);
  scriptEle.setAttribute("type", "text/javascript");
  scriptEle.setAttribute("async", async);

  document.body.appendChild(scriptEle);

  // success event 
  scriptEle.addEventListener("load", () => {
    console.log("File loaded")
  });
   // error event
  scriptEle.addEventListener("error", (ev) => {
    console.log("Error on loading file", ev);
  });
}

loadJS("https://cdn.jsdelivr.net/gh/SaltySpaghetto/ScratchFlixel/Flixel.js", true);

(function(Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        throw new Error("This Hello World example must run unsandboxed");
    }

    let F_States = [];
    let F_Game = null;
    let Width = 480;
    let Height = 360;
    let BGColor = "#ff0000";

    class ScratchedFlixel {


        getInfo() {
            return {
                id: "flixelscratch",
                name: "Flixel",
                blocks: [{
                        opcode: "resetGame",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "Reset All (Do When Green Flag Clicked)",
                  },
                  {
                        opcode: "doSettings",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "Set Game Settings to Width: [WID], Height: [HEI], BG Color: [COL]",
                        arguments: {
                            WID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 480,
                            },
                            HEI: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 360,
                            },
                            COL: {
                                type: Scratch.ArgumentType.COLOR,
                                defaultValue: "#ff0000",
                            },
                        },
                    },
                    {
                        opcode: "makeState",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "Create FlxState With Name: [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ""
                            }
                        }
                    },
                    {
                        opcode: "makeGame",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "Create FlxGame With State: [STATE]",
                        arguments: {
                            STATE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "",
                            },
                        },
                    },
                ],
            };
        }

        resetGame(args) {
          F_States = [];
          F_Game = null;
          Width = 480;
          Height = 360;
          BGColor = "#ff0000";
        }

        doSettings(args) {
            Width = args.WID;
            Height = args.HEI;
            BGColor = args.COL;
        }

        makeState(args) {
            var state = new Class({
                Extends: FlxState,
                initialize: function() {
                    this.parent();
                },

            });
            F_States.push({
                Name: args.NAME,
                Object: state
            });
        }

        makeGame(args) {
            for (var i = 0; i < F_States.length; i++) {
                var state = States[i];
                console.log(state.Name);
                if (state.Name == args.STATE) {
                    F_Game = new Class({

                        Extends: FlxGame,

                        initialize: function() {
                            this.parent(Width, Height, state.Object, 1);
                            FlxState.bgColor = BGColor;
                        },
                    });

                }
            }
        }
    }

    Scratch.extensions.register(new ScratchedFlixel());
})(Scratch);
