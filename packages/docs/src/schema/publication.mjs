const IDENTIFIER = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value, path, errors) {
  if (typeof value === "string" && value.trim().length > 0) return true;
  errors.push(`${path} must be a non-empty string`);
  return false;
}

export function validatePublicationMeta(value) {
  const errors = [];
  if (!isRecord(value)) return ["manifest must be an object"];

  if (!isRecord(value.document)) {
    errors.push("document must be an object");
  } else {
    const document = value.document;
    if (requireString(document.id, "document.id", errors) && !IDENTIFIER.test(document.id)) {
      errors.push("document.id must be a lowercase stable identifier");
    }
    if (requireString(document.namespace, "document.namespace", errors) && !IDENTIFIER.test(document.namespace)) {
      errors.push("document.namespace must be a lowercase stable identifier");
    }
    requireString(document.title, "document.title", errors);
    requireString(document.lang, "document.lang", errors);
  }

  if (requireString(value.sourceCommit, "sourceCommit", errors) && !/^[a-f0-9]{40}$/.test(value.sourceCommit)) {
    errors.push("sourceCommit must be a full lowercase Git SHA");
  }
  if (requireString(value.generatedAt, "generatedAt", errors) && Number.isNaN(Date.parse(value.generatedAt))) {
    errors.push("generatedAt must be an ISO date-time");
  }

  const targets = Array.isArray(value.targets) ? value.targets : [];
  if (targets.length === 0) errors.push("targets must contain at least one render target");
  else if (targets.some((target) => target !== "html" && target !== "pdf")) errors.push('targets may only contain "html" and "pdf"');

  const artifactTargets = new Set();
  if (!Array.isArray(value.artifacts)) {
    errors.push("artifacts must be an array");
  } else {
    value.artifacts.forEach((artifact, index) => {
      const prefix = `artifacts[${index}]`;
      if (!isRecord(artifact)) {
        errors.push(`${prefix} must be an object`);
        return;
      }
      if (artifact.target !== "html" && artifact.target !== "pdf") errors.push(`${prefix}.target must be html or pdf`);
      else artifactTargets.add(artifact.target);
      requireString(artifact.path, `${prefix}.path`, errors);
      if (typeof artifact.sha256 !== "string" || !SHA256.test(artifact.sha256)) errors.push(`${prefix}.sha256 must be a lowercase SHA-256 digest`);
      if (typeof artifact.bytes !== "number" || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 0) errors.push(`${prefix}.bytes must be a non-negative integer`);
    });
  }
  for (const target of targets) {
    if (!artifactTargets.has(target)) errors.push(`targets declares ${target} but artifacts has no ${target} entry`);
  }
  return errors;
}

export function assertPublicationMeta(value) {
  const errors = validatePublicationMeta(value);
  if (errors.length) throw new TypeError(`Invalid publication manifest:\n- ${errors.join("\n- ")}`);
}
