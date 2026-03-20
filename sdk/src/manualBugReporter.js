import { sendError } from "./sender.js";
import { takeScreenshot } from "./takeScreenshot.js";
import { createBasePayload } from "./utils/normalizer.js";

export function initManualBugReporter(config = {}) {
  if (typeof window === "undefined") return;

  const { floatingButton, modalSchema, captureScreenshot = false } = config;

  // Create host container
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.bottom = "20px";
  host.style.right = "20px";
  host.style.zIndex = "2147483647";

  document.body.appendChild(host);

  // Create Shadow DOM
  const shadow = host.attachShadow({ mode: "open" });

  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      font-family: system-ui, sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    button {
      cursor: pointer;
    }

    .bug-btn {
      background: #ff4d4f;
      color: #fff;
      border: none;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal {
      background: #fff;
      width: 420px;
      padding: 20px;
      border-radius: 10px;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
      color: #111;
    }

    h3 {
      font-size: 18px;
      margin-bottom: 14px;
    }

    .field {
      margin-bottom: 14px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
    }

    textarea,
    select,
    input[type="text"] {
      width: 100%;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid #ddd;
      background: #fff;
      color: #111;
      font-size: 14px;
    }

    textarea {
      height: 90px;
    }

    .actions {
      margin-top: 16px;
      display: flex;
      gap: 10px;
    }

    .submit {
      background: #ff4d4f;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
    }

    .cancel {
      background: #222;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
    }
  `;

  shadow.appendChild(style);

  const btn = floatingButton ? floatingButton() : createDefaultButton();
  btn.onclick = () => openModal(shadow, modalSchema, captureScreenshot);

  shadow.appendChild(btn);
}

function createDefaultButton() {
  const btn = document.createElement("button");
  btn.className = "bug-btn";
  btn.textContent = "🐞 Report Bug";
  return btn;
}

function openModal(shadow, schema = {}, captureScreenshot) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const title = document.createElement("h3");
  title.textContent = schema.title || "Report a Bug";
  modal.appendChild(title);

  const formData = {};

  (schema.fields || []).forEach((field) => {
    modal.appendChild(createField(field, formData));
  });

  const actions = document.createElement("div");
  actions.className = "actions";

  const submit = document.createElement("button");
  submit.className = "submit";
  submit.textContent = "Submit";

  const cancel = document.createElement("button");
  cancel.className = "cancel";
  cancel.textContent = "Cancel";

  cancel.onclick = () => overlay.remove();

  submit.onclick = async () => {
    let screenshot = null;

    if (captureScreenshot) {
      screenshot = await takeScreenshot();
    }

    console.log({
      timestamp: new Date().toISOString(),
      event_type: "manual_bug_report",
      data: formData,
      ...(captureScreenshot ? { screenshot } : {}),
      client: {
        url: window.location.href,
        browser: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`,
      },
    })

    const payload = createBasePayload({
  event_type: "manual",

  error: {
    message: formData.description || "Manual bug report",
    type: "user_report"
  },

  metadata: formData,

  screenshot
});
    
    sendError(payload);

    overlay.remove();
  };

  actions.appendChild(submit);
  actions.appendChild(cancel);
  modal.appendChild(actions);

  overlay.appendChild(modal);
  shadow.appendChild(overlay);
}

function createField(field, formData) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.textContent = field.label;
  wrapper.appendChild(label);

  let input;

  switch (field.type) {
    case "textarea":
      input = document.createElement("textarea");
      input.oninput = (e) => (formData[field.name] = e.target.value);
      break;

    case "select":
      input = document.createElement("select");

      (field.options || []).forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        input.appendChild(option);
      });

      input.onchange = (e) => (formData[field.name] = e.target.value);
      break;

    case "radio":
      input = document.createElement("div");

      (field.options || []).forEach((opt) => {
        const container = document.createElement("label");

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = field.name;

        radio.onchange = () => (formData[field.name] = opt);

        container.appendChild(radio);
        container.appendChild(document.createTextNode(" " + opt));
        input.appendChild(container);
      });

      break;

    case "checkbox":
      input = document.createElement("div");
      formData[field.name] = [];

      (field.options || []).forEach((opt) => {
        const container = document.createElement("label");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        checkbox.onchange = (e) => {
          if (e.target.checked) formData[field.name].push(opt);
          else
            formData[field.name] = formData[field.name].filter(
              (v) => v !== opt
            );
        };

        container.appendChild(checkbox);
        container.appendChild(document.createTextNode(" " + opt));
        input.appendChild(container);
      });

      break;

    default:
      input = document.createElement("input");
      input.type = "text";
      input.oninput = (e) => (formData[field.name] = e.target.value);
  }

  wrapper.appendChild(input);
  return wrapper;
}