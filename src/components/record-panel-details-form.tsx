import type {
  PortalFieldConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import { isWritablePortalField } from "@/lib/twenty/validation";
import { PortalRecordValue } from "@/components/portal-record-value";
import {
  recordInputDefaultValue,
  recordInputType,
} from "@/components/record-form";

function selectedMultiValues(value: unknown) {
  return Array.isArray(value)
    ? value.map(String)
    : String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function EditableRecordPanelValue({
  config,
  field,
  value,
}: {
  config: PortalFieldConfig;
  field: TwentyFieldMetadata;
  value: unknown;
}) {
  const id = `panel-field-${field.name}`;
  const label = config.label ?? field.label;

  if (field.type === "MULTI_SELECT" && field.options?.length) {
    const selected = selectedMultiValues(value);
    return (
      <div className="record-panel-editable-field">
        <span className="sr-only">{label}</span>
        <div className="option-checkbox-grid compact-option-grid">
          {field.options.map((option) => (
            <label key={option.value}>
              <input
                defaultChecked={selected.includes(option.value)}
                name={field.name}
                type="checkbox"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "BOOLEAN") {
    return (
      <select
        aria-label={label}
        className="input record-panel-inline-input"
        defaultValue={String(value ?? false)}
        id={id}
        name={field.name}
        required={config.required}
      >
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    );
  }

  if (field.type === "SELECT") {
    return (
      <select
        aria-label={label}
        className="input record-panel-inline-input"
        defaultValue={recordInputDefaultValue(value, field.type)}
        id={id}
        name={field.name}
        required={config.required}
      >
        <option value="">Choose...</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      aria-label={label}
      className="input record-panel-inline-input"
      defaultValue={recordInputDefaultValue(value, field.type)}
      id={id}
      name={field.name}
      required={config.required}
      step={
        field.type === "NUMBER" ||
        field.type === "NUMERIC" ||
        field.type === "CURRENCY"
          ? "any"
          : undefined
      }
      type={recordInputType(field.type)}
    />
  );
}

export function RecordPanelDetailsForm({
  action,
  canEdit,
  editableFields,
  fields,
  formatSelectValues,
  metadataFields,
  values,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canEdit: boolean;
  editableFields: PortalFieldConfig[];
  fields: PortalFieldConfig[];
  formatSelectValues: boolean;
  metadataFields: TwentyFieldMetadata[];
  values: Record<string, unknown>;
}) {
  const metadataByName = new Map(
    metadataFields.map((field) => [field.name, field]),
  );
  const editableByName = new Map(
    canEdit
      ? editableFields
          .filter((config) => {
            const field = metadataByName.get(config.name);
            return field ? isWritablePortalField(field) : false;
          })
          .map((config) => [config.name, config])
      : [],
  );
  const hasEditableFields = editableByName.size > 0;
  const details = (
    <dl className="record-panel-details record-panel-inline-details">
      {fields
        .filter(
          (config) =>
            config.name !== "noteTargets" && config.name !== "attachments",
        )
        .map((config) => {
          const field = metadataByName.get(config.name);
          const label = config.label ?? field?.label ?? config.name;
          const editableConfig = editableByName.get(config.name);
          const editable = Boolean(field && editableConfig);

          return (
            <div className={editable ? "is-editable" : ""} key={config.name}>
              <dt>
                <label htmlFor={editable ? `panel-field-${config.name}` : undefined}>
                  {label}
                </label>
              </dt>
              <dd>
                {editable && field ? (
                  <EditableRecordPanelValue
                    config={editableConfig ?? config}
                    field={field}
                    value={values[config.name]}
                  />
                ) : (
                  <PortalRecordValue
                    formatSelectValues={formatSelectValues}
                    pdfPreview
                    selectOptions={field?.options}
                    type={field?.type}
                    value={values[config.name]}
                  />
                )}
              </dd>
            </div>
          );
        })}
    </dl>
  );

  if (!hasEditableFields) return details;

  return (
    <form action={action} className="record-panel-inline-form">
      {details}
      <div className="record-panel-inline-actions">
        <button className="button compact-button" type="submit">
          Save changes
        </button>
      </div>
    </form>
  );
}
