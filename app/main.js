import { Spreadsheet } from "./spreadsheet/spreadsheet.js";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;
const { useState, onMounted, onWillUnmount} = owl.hooks;

function useReactiveState(computeFn) {
    const state = useState(computeFn({}));
    const updater = owl.utils.debounce(() => {
        Object.assign(state, computeFn());
    }, 0);

    onMounted(() => {
      window.addEventListener("resize", updater);
    });
    onWillUnmount(() => {
      window.removeEventListener("resize", updater);
    });
    return state;
  }

class App extends Component {
    static template = xml`<Spreadsheet width="layout.width" height="layout.height"/>`;
    static style = css`
        html {
            height: 100%;
            body {
                height: 100%;
                margin: 0px;
            }
        }`;
    static components = { Spreadsheet };
    layout = useReactiveState(() => ({
        width: window.innerWidth,
        height: window.innerHeight
    }));
}
// Setup code
function setup() {
    const app = new App();
    app.mount(document.body);
}
whenReady(setup);




// import { App } from "./components/App.js";
// import {parse} from './core/expression_parser.js'

// async function start() {
//     const app = new App();
//     await app.mount(document.body);


// }

// console.log('it works');
// window.parseExpression = parse;

// start();