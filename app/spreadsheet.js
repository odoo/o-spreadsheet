(function (window) {

  const { Component } = owl;
  const { xml } = owl.tags;


  // -----------------------------------------------------------------------------
  // Components
  // -----------------------------------------------------------------------------
  class ToolBar extends Component {
    static template = xml`<div class="o-spreadsheet-toolbar">toolbar</div>`;
  }

  class Sheet extends Component {
    static template = xml`<div class="o-spreadsheet-sheet">sheet</div>`;
  }

  class App extends Component {
    static template = xml`
      <div class="o-spreadsheet">
        <ToolBar/>
        <Sheet/>
      </div>`;

    static components = { ToolBar, Sheet };
  }


  window.App = App;

})(window);

