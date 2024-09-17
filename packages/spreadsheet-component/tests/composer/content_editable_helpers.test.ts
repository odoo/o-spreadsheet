import { ContentEditableHelper } from "../../src/components/composer/content_editable_helper";
import { iterateChildren } from "../../src/components/helpers/dom_helpers";
import { makeTestFixture } from "../test_helpers/helpers";

/**
 * Mock innerText as it is not implemented in jsDom
 * See https://github.com/jsdom/jsdom/issues/1245
 *
 * This mock is not reflecting a 100% the reality
 * (textContent differs from innerText [1])
 *
 * As we never input the newline character directly in the
 * ContentEditableHelper (we provide an array of paragraphs),
 * The two properties are equivalent and can be 'safely' mocked.
 *
 * [1] https://kellegous.com/j/2013/02/27/innertext-vs-textcontent/
 */
Object.defineProperty(HTMLElement.prototype, "innerText", {
  get: function () {
    return this.textContent;
  },
  set: function (text) {
    this.textContent = text;
  },
});

describe("ContentEditableHelper", () => {
  describe("setText only applies a diff to the current content", () => {
    let div: HTMLDivElement;
    let helper: ContentEditableHelper;
    let fixture: HTMLElement;
    beforeEach(() => {
      fixture = makeTestFixture();
      div = document.createElement("div");
      fixture.appendChild(div);
      div.contentEditable = "true";
      helper = new ContentEditableHelper(div);
    });

    afterEach(() => {
      fixture.remove();
    });

    test("writing text in empty div", () => {
      expect(helper.getText()).toBe("");
      helper.setText([[{ value: "hello" }]]);
      expect(helper.getText()).toBe("hello");
      expect(div.innerText).toBe("hello");
    });

    test("Change color of an HTML content", () => {
      helper.setText([[{ value: "hello", color: "#000000" }]]);
      expect(helper.getText()).toBe("hello");
      expect(div.innerText).toBe("hello");
      const childNodes = [...iterateChildren(div)];
      helper.setText([[{ value: "hello", color: "#ffffff" }]]);
      expect(helper.getText()).toBe("hello");
      expect(div.innerText).toBe("hello");
      const childNodesAfter = [...iterateChildren(div)];
      // span nodes are not preserved
      expect(childNodesAfter).not.toEqual(childNodes);
      expect(childNodesAfter).not.toEqual(childNodes);
    });

    test("Adding some text", () => {
      helper.setText([[{ value: "hello" }]]);

      expect(helper.getText()).toBe("hello");
      expect(div.innerText).toBe("hello");
      const childNodes = [...iterateChildren(div)];
      expect(childNodes.length).toBe(4);
      const [, paragraphNode, spanNode] = childNodes;
      expect(div).toMatchSnapshot();

      helper.setText([[{ value: "hello" }, { value: "test" }]]);
      expect(helper.getText()).toBe("hellotest");
      expect(div.innerText).toBe("hellotest");

      const childNodesAfter = [...iterateChildren(div)];
      expect(childNodesAfter).not.toEqual(childNodes);
      expect(childNodesAfter.length).toBe(6);
      expect(div).toMatchSnapshot();

      const [, paragraphNodeAfter, spanNodeAfter] = childNodesAfter;
      // paragraph node is preserved
      expect(paragraphNodeAfter.nodeName).toBe("P");
      expect(paragraphNodeAfter).toEqual(paragraphNode);
      // the first 'SPAN' node is preserved
      expect(spanNodeAfter.nodeName).toBe("SPAN");
      expect(spanNodeAfter).toEqual(spanNode);
    });

    test("Removing some text", () => {
      helper.setText([[{ value: "hello" }, { value: "test" }]]);

      expect(helper.getText()).toBe("hellotest");
      expect(div.innerText).toBe("hellotest");
      const childNodes = [...iterateChildren(div)];
      expect(childNodes.length).toBe(6);
      const [, paragraphNode, spanNode] = childNodes;
      expect(div).toMatchSnapshot();

      helper.setText([[{ value: "hello" }]]);
      expect(helper.getText()).toBe("hello");
      expect(div.innerText).toBe("hello");

      const childNodesAfter = [...iterateChildren(div)];
      expect(childNodesAfter).not.toEqual(childNodes);
      expect(childNodesAfter.length).toBe(4);
      const [, paragraphNodeAfter, spanNodeAfter] = childNodesAfter;
      expect(div).toMatchSnapshot();

      // paragraph node is preserved
      expect(paragraphNodeAfter.nodeName).toBe("P");
      expect(paragraphNodeAfter).toEqual(paragraphNode);
      // the first 'SPAN' node is preserved
      expect(spanNodeAfter.nodeName).toBe("SPAN");
      expect(spanNodeAfter).toEqual(spanNode);
    });
  });
});
