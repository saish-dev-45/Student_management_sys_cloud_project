import { createPortal } from "react-dom";

// Renders children at <body> level. Needed because `.glass` panels use
// backdrop-filter, which makes `position: fixed` children relative to the panel
// instead of the viewport (modal/backdrop got clipped and the sidebar wasn't dimmed).
export default function Portal({ children }) {
  return createPortal(children, document.body);
}
