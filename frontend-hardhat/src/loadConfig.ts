export async function loadLocalConfig() {
  try {
    const res = await fetch("/deploy-local.json?" + Date.now()); // 加时间戳避免缓存
    if (!res.ok) throw new Error("File not found");
    const json = await res.json();
    console.log("Loaded deploy-local.json:", json);
    return json;
  } catch (err) {
    console.error("Failed to load deploy-local.json:", err);
    return null;
  }
}
