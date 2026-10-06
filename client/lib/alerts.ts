import Swal from "sweetalert2";

const popup = Swal.mixin({
  background: "var(--paper)",
  color: "var(--ink)",
  scrollbarPadding: false,
  buttonsStyling: false,
  customClass: {
    popup: "foodflow-popup",
    title: "foodflow-popup-title",
    htmlContainer: "foodflow-popup-copy",
    confirmButton: "foodflow-popup-confirm",
    cancelButton: "foodflow-popup-cancel",
    actions: "foodflow-popup-actions",
  },
});

export function successToast(title: string, text?: string) {
  return popup.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title,
    text,
    showConfirmButton: false,
    showCloseButton: true,
    timer: 2800,
    timerProgressBar: true,
  });
}

export function warningToast(title: string, text: string) {
  return popup.fire({
    toast: true,
    position: "top-end",
    icon: "warning",
    title,
    text,
    showConfirmButton: false,
    showCloseButton: true,
    timer: 3500,
    timerProgressBar: true,
  });
}

export function errorMessage(error: unknown) {
  return popup.fire({
    heightAuto: false,
    icon: "error",
    title: "Let’s try that again.",
    text:
      error instanceof Error
        ? error.message
        : "Something went wrong. Please retry.",
    confirmButtonText: "Got it",
  });
}

export function orderPlaced(reference: string) {
  return popup.fire({
    heightAuto: false,
    icon: "success",
    title: "WE’VE GOT IT.",
    text: `Order #${reference.slice(-8).toUpperCase()} has reached the kitchen. Follow its progress on the next page.`,
    confirmButtonText: "Track my order →",
    allowOutsideClick: false,
  });
}

export async function confirmAction(title: string, text?: string) {
  const result = await popup.fire({
    heightAuto: false,
    icon: "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Yes, continue",
    cancelButtonText: "Keep it",
    focusCancel: true,
  });
  return result.isConfirmed;
}

export async function requestText(title: string, value: string) {
  const result = await popup.fire({
    heightAuto: false,
    title,
    input: "text",
    inputLabel: "Category name",
    inputValue: value,
    inputAttributes: { maxlength: "80", autocomplete: "off" },
    showCancelButton: true,
    confirmButtonText: "Save name →",
    cancelButtonText: "Cancel",
    inputValidator: (input) =>
      input.trim() ? undefined : "Enter a category name.",
  });
  return result.isConfirmed && typeof result.value === "string"
    ? result.value.trim()
    : null;
}
