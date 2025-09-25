import RBush from "rbush";

class ZoneRBush extends RBush<any> {
  toBBox({ boundingBox }: any) {
    const zone = boundingBox.zone;
    return {
      minX: zone.left,
      minY: zone.top,
      maxX: zone.right,
      maxY: zone.bottom,
    };
  }
  compareMinX(a: any, b: any) {
    return a.boundingBox.zone.left - b.boundingBox.zone.left;
  }
  compareMinY(a: any, b: any) {
    return a.boundingBox.zone.top - b.boundingBox.zone.top;
  }
}

export function hello() {
  const x = new ZoneRBush();
  console.log("Hello from o-spreadsheet-engine!");
  return x;
}
