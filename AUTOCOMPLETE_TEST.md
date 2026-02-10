# Variable Autocomplete Testing Guide

## Test the autocomplete feature

The development server is running at http://localhost:3001

## Setup

1. Open http://localhost:3001 in your browser
2. Make sure you have some environment variables configured:
   - Click on the "Environment" panel (if available)
   - Add a few test variables like:
     - `test_account_id` = "test-account-123"
     - `test_store_id` = "test-store-456"
     - `api_key` = "klarna_test_api_..." (mark as secret)

## Test Cases

### 1. Basic Trigger Test
- In the path input field, type: `{{`
- ✅ Expected: Dropdown appears with all available variables

### 2. Filtering Test
- Type: `{{test`
- ✅ Expected: Only variables containing "test" are shown
- Prefix matches (e.g., "test_account_id") should appear first

### 3. Keyboard Navigation Test
- Trigger autocomplete with `{{`
- Press Arrow Down → Selection moves to next variable
- Press Arrow Up → Selection moves to previous variable
- ✅ Expected: Selected item is highlighted

### 4. Enter/Tab Selection Test
- Trigger autocomplete with `{{`
- Press Arrow Down to select a variable
- Press Enter (or Tab)
- ✅ Expected: Variable is inserted as `{{variable_name}}`
- ✅ Expected: Cursor is positioned after the closing `}}`

### 5. Click Selection Test
- Trigger autocomplete with `{{`
- Click on a variable in the dropdown
- ✅ Expected: Variable is inserted as `{{variable_name}}`

### 6. Escape Key Test
- Trigger autocomplete with `{{`
- Press Escape
- ✅ Expected: Dropdown closes

### 7. Click Outside Test
- Trigger autocomplete with `{{`
- Click anywhere outside the dropdown
- ✅ Expected: Dropdown closes

### 8. Textarea Position Test (Request Body)
- Select a POST/PATCH/PUT method
- In the request body textarea, type: `{"key": "{{`
- ✅ Expected: Dropdown appears at cursor position, not at top of textarea

### 9. Multiple Triggers Test
- Type: `hello {{var1}} and {{`
- ✅ Expected: Autocomplete triggers on the second `{{`
- Complete the second variable
- ✅ Expected: Result is `hello {{var1}} and {{var2}}`

### 10. Cursor Movement Test
- Type: `{{test`
- Move cursor before the `{{` (using arrow keys or mouse)
- ✅ Expected: Dropdown closes

### 11. Secret Variable Display Test
- Trigger autocomplete
- Look for variables marked as secret
- ✅ Expected: Secret variables show:
  - Lock icon
  - Value displayed as `••••••`

### 12. Source Badge Test
- Trigger autocomplete
- ✅ Expected: Each variable shows a colored badge:
  - Vercel (blue)
  - Env File (green)
  - User (purple)
  - Response (orange)

### 13. Empty State Test
- Type: `{{xyz999nonexistent`
- ✅ Expected: "No matching variables" message

### 14. All Fields Test
Test autocomplete in each of these fields:
- ✅ Path input (top of form)
- ✅ Path parameter values (if endpoint has path params)
- ✅ Required header values
- ✅ Custom header names
- ✅ Custom header values
- ✅ Request body textarea

### 15. Viewport Boundary Test
- Trigger autocomplete near the bottom or right edge of the browser window
- ✅ Expected: Dropdown repositions to stay within viewport (with 8px padding)

### 16. Footer Keyboard Hints Test
- Trigger autocomplete
- ✅ Expected: Footer shows: "↑↓ Navigate • Enter/Tab Select • Esc Close"

## Common Issues to Check

- Dropdown should not be clipped by parent containers (uses portal rendering)
- Dropdown should close when typing normal characters (not part of variable name)
- Multiple autocomplete instances should work independently
- Tab key should work for both selection and normal tab behavior
- Disabled inputs should not trigger autocomplete

## Performance Check

- Type `{{` and then type quickly
- ✅ Expected: Filtering is debounced (100ms), should feel smooth
- No lag or stuttering when typing

## Accessibility Check

- Use keyboard only (no mouse) to:
  - Trigger autocomplete
  - Navigate with arrows
  - Select with Enter
  - Dismiss with Escape
- ✅ Expected: All interactions work without a mouse
