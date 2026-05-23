import { render } from "preact";
import { App } from "./app.jsx";
import "./clientLogger.js";
import "./index.css";

render(<App />, document.getElementById("app"));
