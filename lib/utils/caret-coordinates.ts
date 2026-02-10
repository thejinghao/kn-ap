/**
 * Calculate the pixel coordinates of the caret/cursor position in a textarea or input element.
 * Used for positioning autocomplete dropdowns at the cursor location.
 *
 * Based on the approach from https://github.com/component/textarea-caret-position
 */

interface CaretCoordinates {
  top: number;
  left: number;
  height: number;
}

// Properties that affect text layout and must be copied to the mirror div
const properties = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordBreak',
  'wordWrap',
];

export function getCaretCoordinates(
  element: HTMLInputElement | HTMLTextAreaElement,
  position: number
): CaretCoordinates {
  const isInput = element.tagName === 'INPUT';

  // Create a mirror div with the same styling
  const div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);

  // Default for textarea, override for input
  style.whiteSpace = isInput ? 'nowrap' : 'pre-wrap';
  style.wordWrap = 'break-word';

  // Position off-screen
  style.position = 'absolute';
  style.visibility = 'hidden';

  // Copy all relevant CSS properties
  properties.forEach((prop) => {
    style.setProperty(prop, computed.getPropertyValue(prop));
  });

  // Firefox needs special handling
  if (typeof (window as any).mozInnerScreenX !== 'undefined') {
    // Firefox lies about the overflow property for textareas
    if (element.scrollHeight > parseInt(computed.height)) {
      style.overflowY = 'scroll';
    }
  } else {
    // IE needs special handling
    style.overflow = 'hidden';
  }

  // Copy the text content up to the cursor position
  const textBeforeCaret = element.value.substring(0, position);
  div.textContent = textBeforeCaret;

  // Add a span to measure at the cursor position
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates: CaretCoordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth),
    height: parseInt(computed.lineHeight),
  };

  // Account for scroll position
  if (element.tagName === 'TEXTAREA') {
    coordinates.top -= element.scrollTop;
    coordinates.left -= element.scrollLeft;
  }

  // Clean up
  document.body.removeChild(div);

  return coordinates;
}
