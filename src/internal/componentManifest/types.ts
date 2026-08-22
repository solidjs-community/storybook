export interface SerializedPropIf {
    arg: string;
    eq: string | number | boolean;
}

export interface SerializedPropType {
    name: string;
    raw?: string;
    value?: Array<{ value: string }>;
}

export interface SerializedProp {
    name: string;
    description?: string;
    required: boolean;
    type: SerializedPropType;
    defaultValue?: { value: string };
    if?: SerializedPropIf;
}

export interface SolidComponentDoc {
    displayName?: string;
    exportName: string;
    filePath: string;
    description?: string;
    jsDocTags?: Record<string, string[]>;
    props: Record<string, SerializedProp>;
}

export interface ComponentRef {
    componentName: string;
    localImportName?: string;
    importId?: string;
    importName?: string;
    member?: string;
    namespace?: string;
    path?: string;
    jsxDepth?: number;
    isPackage?: boolean;
    reactComponentMeta?: SolidComponentDoc;
    componentJsDocTags?: Record<string, string[]>;
    importOverride?: string;
}

export interface StoryExtractionEntry {
    storyPath: string;
    component: ComponentRef;
}

export interface ResolvedComponent {
    componentRef: ComponentRef;
    propsType: import('@typescript/typescript6').Type;
    symbol: import('@typescript/typescript6').Symbol;
}
