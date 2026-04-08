import { Editor, OnMount, useMonaco } from "@monaco-editor/react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useRef } from "react";
import useAppParams from "../shared/hooks/useAppParams";
import { useGetConfigQuery } from "../store/apiSlice";

type IConfigViewer = Parameters<OnMount>[0];

const ConfigFile = () => {
  const { appId } = useAppParams();
  const { data: config } = useGetConfigQuery(appId ? { appId } : skipToken);

  if (!config) {
    return <div>Config Data Loading or Not Available</div>;
  }

  return <ConfigFileRender config={config} />;
};

export default ConfigFile;

const ConfigFileRender = ({ config }: { config: any }) => {
  console.log("ConfigFileRender == ", config);
  const monaco = useMonaco();
  const editorRef = useRef<IConfigViewer | null>(null);

  useEffect(() => {
    if (!monaco) return;

    (monaco.languages as any).json?.jsonDefaults?.setDiagnosticsOptions({
      enableSchemaRequest: false,
      allowComments: false,
      validate: true,
    });
  }, [monaco]);

  // Set the editor reference
  function handleEditorDidMount(editor: IConfigViewer) {
    editorRef.current = editor;
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="json"
      language="json"
      options={{
        readOnly: true,
      }}
      value={JSON.stringify(config, null, 2)}
      onMount={handleEditorDidMount}
      theme="vs-dark"
    />
  );
};
