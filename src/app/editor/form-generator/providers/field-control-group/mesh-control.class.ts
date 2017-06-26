import { MeshNode, NodeFieldMicronode, NodeFieldType } from '../../../../common/models/node.model';
import { MeshControlErrors, SchemaFieldPath } from '../../common/form-generator-models';
import { SchemaField } from '../../../../common/models/schema.model';
import { BaseFieldComponent } from '../../components/base-field/base-field.component';
import { MeshControlGroupService } from './mesh-control-group.service';

export const ROOT_TYPE = 'root';
export const ROOT_NAME = 'root';

class RootFieldDefinition {
    type = ROOT_TYPE;
    name = ROOT_NAME;
    required = false;
}

/**
 * A MeshControl is a wrapper around a BaseFieldComponent, and is responsible for propagating calls to the
 * BaseFieldComponent.valueChange() and BaseFieldComponent.formWidthChange() methods. MeshControls can be nested
 * by use of the addChild() method, which allows the implementation of complex types such as lists and
 * micronodes.
 */
export class MeshControl {
    meshField: BaseFieldComponent;
    children = new Map<string | number, MeshControl>();
    fieldDef: SchemaField | RootFieldDefinition;

    /**
     * Returns the MeshControlCroup which is at the top of the tree of controls.
     */
    get group(): MeshControlGroupService | undefined {
        return this.meshControlGroup;
    }
    private meshControlGroup: MeshControlGroupService | undefined;
    private lastValue;

    /**
     * Returns true if this MeshControl and all of its children are valid
     */
    get isValid(): boolean {
        const isRootControl = this.fieldDef.type === ROOT_TYPE;
        const selfValid = isRootControl || !!this.meshField && this.meshField.isValid;
        const childrenValid = Array.from(this.children.values())
            .reduce((valid, control) => !valid ? false : control.isValid, true);
        return selfValid && childrenValid;
    }

    get errors(): MeshControlErrors {
        return this.meshField.errors;
    }

    constructor();
    constructor(fieldDef: SchemaField, initialValue: any, group?: MeshControlGroupService, meshFieldInstance?: BaseFieldComponent);
    constructor(fieldDef?: SchemaField, initialValue?: any, group?: MeshControlGroupService, meshFieldInstance?: BaseFieldComponent) {
        this.meshControlGroup = group;
        this.lastValue = initialValue;
        this.fieldDef = fieldDef === undefined ? new RootFieldDefinition() : fieldDef;
        if (meshFieldInstance) {
            this.registerMeshFieldInstance(meshFieldInstance);
        }
    }

    /**
     * In some circumstances we cannot set this.meshField during construction, in which case this method is used
     * to set it later.
     */
    registerMeshFieldInstance(meshFieldInstance: BaseFieldComponent): void {
        this.meshField = meshFieldInstance;
    }

    /**
     * Runs the `valueChange()` function for this control's BaseFieldComponent, and optionally checks recursively for all descendants.
     */
    checkValue(value: NodeFieldType, recursive: boolean = false) {
        if (this.meshField) {
            this.meshField.valueChange(value, this.lastValue);
        }
        this.lastValue = value;

        if (recursive && 0 < this.children.size) {
            const isMicronode = this.fieldDef.type === 'micronode';
            const valueContainer = isMicronode && value && value.hasOwnProperty('fields') ? (value as NodeFieldMicronode).fields : value;
            if (valueContainer) {
                this.children.forEach((meshControl, key) => {
                    meshControl.checkValue(valueContainer[key], true);
                });
            }
        }
    }

    /**
     * Runs the `nodeFieldChange()` function for this control's BaseFieldComponent and recursively for all the control's descendants.
     */
    nodeChanged(path: SchemaFieldPath, value: any, node: MeshNode): void {
        if (this.meshField) {
            this.meshField.nodeFieldChange(path, value, node);
        }
        if (0 < this.children.size) {
            this.children.forEach(meshControl => {
                meshControl.nodeChanged(path, value, node);
            });
        }
    }

    /**
     * Runs the `formWidthChanged()` function for this control's BaseFieldComponent and recursively for all the control's descendants.
     */
    formWidthChanged(widthInPixels: number): void {
        if (this.meshField) {
            this.meshField.formWidthChange(widthInPixels);
        }
        if (0 < this.children.size) {
            this.children.forEach(meshControl => {
                meshControl.formWidthChanged(widthInPixels);
            });
        }
    }

    /**
     * Remove all child MeshControls.
     */
    clearChildren(): void {
        this.children.clear();
    }

    /**
     * Adds a new MeshControl as a child of this one.
     */
    addChild(field: SchemaField, initialValue: any, control?: BaseFieldComponent): MeshControl {
        const useStringIndex = this.fieldDef.type === 'micronode' || this.fieldDef.type === ROOT_TYPE;
        const meshControl = new MeshControl(field, initialValue, this.group, control);
        const key = useStringIndex ? field.name : this.children.size;
        this.children.set(key, meshControl);
        return meshControl;
    }

    /**
     * Given a path (e.g. ['locations', 0, 'longitude']), returns the associated MeshControl if one exists.
     */
    getMeshControlAtPath(path: SchemaFieldPath): MeshControl | undefined {
        let pointer: MeshControl | undefined = this;
        const isMicronode = (control: MeshControl): boolean => control.fieldDef.type === 'micronode';

        path.forEach((key, index) => {
            if (pointer) {
                if (isMicronode(pointer)) {
                    // skip the "fields" key, since it simply refers to the contents of the micronode group.
                    if (key !== 'fields') {
                        if (!pointer.children.get(key)) {
                            pointer = undefined;
                        } else {
                            pointer = pointer.children.get(key);
                        }
                    } else if (index === path.length - 1) {
                        pointer = undefined;
                    }
                } else {
                    pointer = pointer.children.get(key);
                }
            }
        });
        return pointer;
    }
}
