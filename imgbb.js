const IMGBB_API_KEY = "751194845c20c559eba736cbd5d6c7f3";

export function hasImgBBKey() {
  return IMGBB_API_KEY && IMGBB_API_KEY.length > 0;
}

export function previewImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = () => reject(new Error("Could not preview selected image."));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToImgBB(file) {
  if (!hasImgBBKey()) {
    throw new Error("Add your ImgBB API key in imgbb.js before uploading images.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result?.error?.message || "ImgBB upload failed.");
  }

  return result.data.display_url || result.data.url;
}
