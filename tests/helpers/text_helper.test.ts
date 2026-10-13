import { Style } from "../../src";
import { DEFAULT_FONT, MIN_CELL_TEXT_MARGIN } from "../../src/constants";
import {
  computeRotationPosition,
  computeTextFont,
  getDefaultContextFont,
} from "../../src/helpers/text_helper";

describe("computeTextFont", () => {
  test("uses the default font when the style has no font", () => {
    expect(computeTextFont({ fontSize: 12 }, "px")).toBe(`400 12px ${DEFAULT_FONT}`);
  });

  test("uses the style font with the default font as fallback", () => {
    expect(computeTextFont({ fontSize: 12, font: "Verdana" }, "px")).toBe(
      `400 12px Verdana,${DEFAULT_FONT}`
    );
  });
});

describe("getDefaultContextFont", () => {
  test("uses the default font when no font is given", () => {
    expect(getDefaultContextFont(12)).toBe(`  12px ${DEFAULT_FONT}`);
  });

  test("uses the given font", () => {
    expect(getDefaultContextFont(12, true, true, "Verdana")).toBe("italic bold 12px Verdana");
  });
});

describe("computeRotationPosition", () => {
  const rotate = (x, y, rotation) => {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    return { x: cos * x - sin * y, y: cos * y + sin * x };
  };
  const textWidth = 100;
  const textHeight = 20;
  const x = 1000;
  const y = 2000;
  const textBox = { x, y, textWidth: textWidth + 2 * MIN_CELL_TEXT_MARGIN, textHeight };

  describe("Top Left anchor", () => {
    const style: Style = { align: "left", verticalAlign: "top" };

    test.each([0, Math.PI * 2])("No rotation", (rotation) => {
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(1000),
        y: expect.toBeCloseTo(2000),
      });
    });

    test.each([Math.PI / 2, Math.PI / 3, Math.PI / 4])("Positive Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x + sin * textHeight;
      const newY = textBox.y;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });

    test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4])("Negative Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x;
      const newY = textBox.y - sin * textWidth;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });
  });

  describe("Top Center anchor", () => {
    const style: Style = { align: "center", verticalAlign: "top" };

    test.each([0, Math.PI * 2])("No rotation", (rotation) => {
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(1000),
        y: expect.toBeCloseTo(2000),
      });
    });

    test.each([Math.PI / 2, Math.PI / 3, Math.PI / 4])("Positive Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x + (sin * textHeight) / 2;
      const newY = textBox.y + (sin * textWidth) / 2;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });

    test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4])("Negative Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x + (sin * textHeight) / 2;
      const newY = textBox.y - (sin * textWidth) / 2;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });
  });

  describe("Top Right anchor", () => {
    const style: Style = { align: "right", verticalAlign: "top" };

    test.each([0, Math.PI * 2])("No rotation", (rotation) => {
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(1000),
        y: expect.toBeCloseTo(2000),
      });
    });

    test.each([Math.PI / 2, Math.PI / 3, Math.PI / 4])("Positive Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x;
      const newY = textBox.y + sin * textWidth;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });

    test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4])("Negative Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x + sin * textHeight;
      const newY = textBox.y;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });
  });

  describe("Middle Left anchor", () => {
    const style: Style = { align: "left", verticalAlign: "middle" };

    test.each([0, Math.PI * 2])("No rotation", (rotation) => {
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(1000),
        y: expect.toBeCloseTo(2000),
      });
    });

    test.each([Math.PI / 2, Math.PI / 3, Math.PI / 4])("Positive Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x + sin * textHeight;
      const newY = textBox.y - (sin * textWidth) / 2;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });

    test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4])("Negative Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const cos = Math.cos(rotation);
      const newX = textBox.x;
      const newY = textBox.y - (sin * textWidth) / 2 + (cos * textHeight) / 4;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });
  });

  describe("Middle Center anchor", () => {
    const style: Style = { align: "center", verticalAlign: "middle" };

    test.each([0, Math.PI * 2])("No rotation", (rotation) => {
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(1000),
        y: expect.toBeCloseTo(2000),
      });
    });

    test.each([Math.PI / 2, Math.PI / 3, Math.PI / 4])("Positive Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x + (sin * textHeight) / 2;
      const newY = textBox.y - textHeight / 2 + sin * textHeight;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });

    test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4])("Negative Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x + (sin * textHeight) / 2;
      const newY = textBox.y - textHeight / 2 - sin * textHeight;
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });
  });

  describe("Middle Right anchor", () => {
    const style: Style = { align: "right", verticalAlign: "middle" };

    test.each([0, Math.PI * 2])("No rotation", (rotation) => {
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(1000),
        y: expect.toBeCloseTo(2000),
      });
    });

    test.each([Math.PI / 2, Math.PI / 3, Math.PI / 4])("Positive Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const cos = Math.cos(rotation);
      const newX = textBox.x;
      const newY = textBox.y + (sin * textWidth) / 2 + (cos * textHeight) / 4;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });

    test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4])("Negative Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const newX = textBox.x + sin * textHeight;
      const newY = textBox.y + (sin * textWidth) / 2;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });
  });

  describe("Bottom Left anchor", () => {
    const style: Style = { align: "left", verticalAlign: "bottom" };

    test.each([0, Math.PI * 2])("No rotation", (rotation) => {
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(1000),
        y: expect.toBeCloseTo(2000),
      });
    });

    test.each([Math.PI / 2, Math.PI / 3, Math.PI / 4])("Positive Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const cos = Math.cos(rotation);
      const newX = textBox.x + sin * textHeight;
      const newY = textBox.y + (1 - cos) * textHeight - sin * textWidth;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });

    test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4])("Negative Rotation", (rotation) => {
      const cos = Math.cos(rotation);
      const newX = textBox.x;
      const newY = textBox.y + (1 - cos) * textHeight;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });
  });

  describe("Bottom Center anchor", () => {
    const style: Style = { align: "center", verticalAlign: "bottom" };

    test.each([0, Math.PI * 2])("No rotation", (rotation) => {
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(1000),
        y: expect.toBeCloseTo(2000),
      });
    });

    test.each([Math.PI / 2, Math.PI / 3, Math.PI / 4])("Positive Rotation", (rotation) => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const newX = textBox.x + (sin * textHeight) / 2;
      const newY = textBox.y + (1 - cos) * textHeight - (sin * textWidth) / 2;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });

    test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4])("Negative Rotation", (rotation) => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const newX = textBox.x + (sin * textHeight) / 2;
      const newY = textBox.y + (1 - cos) * textHeight + (sin * textWidth) / 2;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });
  });

  describe("Bottom Right anchor", () => {
    const style: Style = { align: "right", verticalAlign: "bottom" };

    test.each([0, Math.PI * 2])("No rotation", (rotation) => {
      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(1000),
        y: expect.toBeCloseTo(2000),
      });
    });

    test.each([Math.PI / 2, Math.PI / 3, Math.PI / 4])("Positive Rotation", (rotation) => {
      const cos = Math.cos(rotation);
      const newX = textBox.x;
      const newY = textBox.y + (1 - cos) * textHeight;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });

    test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4])("Negative Rotation", (rotation) => {
      const sin = Math.sin(rotation);
      const cos = Math.cos(rotation);
      const newX = textBox.x + sin * textHeight;
      const newY = textBox.y + (1 - cos) * textHeight + sin * textWidth;

      expect(computeRotationPosition(textBox, { ...style, rotation })).toMatchObject({
        x: expect.toBeCloseTo(rotate(newX, newY, rotation).x),
        y: expect.toBeCloseTo(rotate(newX, newY, rotation).y),
      });
    });
  });
});
