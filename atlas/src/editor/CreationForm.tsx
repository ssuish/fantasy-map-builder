import type { FormEvent } from "react";
import { normalizeSeed } from "../terrain/generation";
import type { TerrainKind, TerrainSettings } from "../terrain/types";

export interface CreationFormProps {
  candidate: TerrainSettings;
  kind: TerrainKind;
  onChange: (settings: TerrainSettings) => void;
  onKindChange: (kind: TerrainKind) => void;
  onRandomSeed: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  idPrefix: string;
  disabled?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
  error?: string;
}

function updatePercentage(
  settings: TerrainSettings,
  key: keyof Pick<
    TerrainSettings,
    "seaLevel" | "roughness" | "temperatureTarget" | "moistureTarget"
  >,
  value: string,
): TerrainSettings {
  const parsed = Number.parseInt(value, 10);
  return {
    ...settings,
    [key]: Number.isFinite(parsed) ? parsed : 0,
  };
}

export function CreationForm({
  candidate,
  kind,
  onChange,
  onKindChange,
  onRandomSeed,
  onSubmit,
  submitLabel,
  idPrefix,
  disabled = false,
  cancelLabel,
  onCancel,
  error,
}: CreationFormProps) {
  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const generated = kind === "generated";

  return (
    <form className="creation-form" onSubmit={onSubmit}>
      <fieldset disabled={disabled}>
        <legend className="sr-only">Terrain kind</legend>
        <div
          className="kind-choice"
          role="radiogroup"
          aria-label="Terrain kind"
        >
          <label
            className={`kind-option${kind === "blank" ? " selected" : ""}`}
          >
            <input
              type="radio"
              name={`${idPrefix}-kind`}
              value="blank"
              checked={kind === "blank"}
              onChange={() => onKindChange("blank")}
            />
            <span>
              <strong>Blank terrain</strong>
              <small>Neutral flat land for exploration.</small>
            </span>
          </label>
          <label className={`kind-option${generated ? " selected" : ""}`}>
            <input
              type="radio"
              name={`${idPrefix}-kind`}
              value="generated"
              checked={generated}
              onChange={() => onKindChange("generated")}
            />
            <span>
              <strong>Generated terrain</strong>
              <small>Build a deterministic world from your settings.</small>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="form-fields">
        <div className="field field-seed">
          <label htmlFor={fieldId("seed")}>Seed</label>
          <div className="seed-row">
            <input
              id={fieldId("seed")}
              name="seed"
              type="text"
              value={candidate.seed}
              onChange={(event) =>
                onChange({ ...candidate, seed: event.target.value })
              }
              autoComplete="off"
              disabled={disabled}
              data-dialog-initial-focus={
                idPrefix === "replacement" ? true : undefined
              }
            />
            <button
              type="button"
              className="button button-secondary random-seed"
              onClick={onRandomSeed}
              disabled={disabled}
            >
              Random seed
            </button>
          </div>
          <small className="field-help effective-seed">
            Effective seed: <strong>{normalizeSeed(candidate.seed)}</strong>
          </small>
          <small className="field-help">
            Empty seeds use <code>atlas</code>. Whitespace is trimmed when the
            Map starts.
          </small>
        </div>

        <div className="field">
          <label htmlFor={fieldId("sea-level")}>Sea level</label>
          <div className="range-row">
            <input
              id={fieldId("sea-level")}
              name="seaLevel"
              type="number"
              min={0}
              max={99}
              step={1}
              value={candidate.seaLevel}
              onChange={(event) =>
                onChange(
                  updatePercentage(candidate, "seaLevel", event.target.value),
                )
              }
              disabled={disabled}
            />
            <span aria-hidden="true">%</span>
          </div>
          <small className="field-help">Fixed for this editing session.</small>
        </div>

        <div className="field">
          <label htmlFor={fieldId("roughness")}>Roughness</label>
          <div className="range-row">
            <input
              id={fieldId("roughness")}
              name="roughness"
              type="number"
              min={0}
              max={100}
              step={1}
              value={candidate.roughness}
              onChange={(event) =>
                onChange(
                  updatePercentage(candidate, "roughness", event.target.value),
                )
              }
              disabled={disabled || !generated}
            />
            <span aria-hidden="true">%</span>
          </div>
          <small className="field-help">
            {generated
              ? "Sets the variation in generated elevation."
              : "Generated terrain only."}
          </small>
        </div>

        <fieldset className="climate-fields" disabled={disabled || !generated}>
          <legend>Climate targets</legend>
          <div className="climate-grid">
            <div className="field">
              <label htmlFor={fieldId("temperature")}>Temperature</label>
              <div className="range-row">
                <input
                  id={fieldId("temperature")}
                  name="temperatureTarget"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={candidate.temperatureTarget}
                  onChange={(event) =>
                    onChange(
                      updatePercentage(
                        candidate,
                        "temperatureTarget",
                        event.target.value,
                      ),
                    )
                  }
                  disabled={disabled || !generated}
                />
                <span aria-hidden="true">%</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor={fieldId("moisture")}>Moisture</label>
              <div className="range-row">
                <input
                  id={fieldId("moisture")}
                  name="moistureTarget"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={candidate.moistureTarget}
                  onChange={(event) =>
                    onChange(
                      updatePercentage(
                        candidate,
                        "moistureTarget",
                        event.target.value,
                      ),
                    )
                  }
                  disabled={disabled || !generated}
                />
                <span aria-hidden="true">%</span>
              </div>
            </div>
          </div>
        </fieldset>
      </div>

      {!generated && (
        <p className="form-note">
          Climate targets and roughness apply to generated terrain. Blank
          terrain stays neutral and flat.
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        {onCancel && cancelLabel && (
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
            disabled={disabled}
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          className="button button-primary"
          disabled={disabled}
        >
          {disabled ? "Creating Map…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
