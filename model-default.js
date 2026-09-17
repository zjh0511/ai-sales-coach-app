// Select only a model actually returned for this key; never invent an alias.
export function defaultModel(models, previous='') {
  if(previous)return models.some(m=>m.id===previous)?previous:'';
  return models.find(m=>m.id.replace(/^models\//,'')==='gemini-3.5-flash-lite')?.id||'';
}
