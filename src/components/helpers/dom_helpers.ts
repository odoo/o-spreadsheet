/**
 *  returns true if the element or one of its parents has the class classname
 */
export function hasSomeParentTheClass(element: HTMLElement, classname: string): boolean {
  if (element.classList.contains(classname)) return true;
  if (element.parentElement) {
    return hasSomeParentTheClass(element.parentElement, classname);
  }
  return false;
}
