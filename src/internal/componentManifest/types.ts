export type SerializedPropType = {
    name: string;
    raw?: string;
    value?: Array<{ value: string }>;
};

export type SerializedProp = {
    name: string;
    description?: string;
    required: boolean;
    type: SerializedPropType;
    defaultValue?: { value: string };
};

export type SolidComponentDoc = {
    displayName?: string;
    exportName: string;
    filePath: string;
    description?: string;
    jsDocTags?: Record<string, string[]>;
    props: Record<string, SerializedProp>;
};

export type ComponentRef = {
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
};

export type StoryExtractionEntry = {
    storyPath: string;
    component: ComponentRef;
};

export type ResolvedComponent = {
    componentRef: ComponentRef;
    propsType: import('typescript').Type;
    symbol: import('typescript').Symbol;
};
