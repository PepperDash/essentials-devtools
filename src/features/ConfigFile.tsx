import { Editor, OnMount, useMonaco } from '@monaco-editor/react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useEffect, useRef } from 'react';
import { Button } from 'react-bootstrap';
import useAppParams from '../shared/hooks/useAppParams';
import { useGetConfigQuery } from '../store/apiSlice';

type IConfigViewer = Parameters<OnMount>[0];

const ConfigFile = () => {
  const { appId } = useAppParams();
  const { data: config, refetch, isFetching } = useGetConfigQuery(appId ? { appId } : skipToken);

  if (!config) {
    return <div>Config Data Loading or Not Available</div>;
  }

  return (
    <div className="d-flex flex-column h-100">
      <div className="mb-2 d-flex justify-content-end">
        <Button variant="outline-secondary" size="sm" onClick={refetch} disabled={isFetching}>
          {isFetching ? 'Refreshing…' : 'Refresh Config'}
        </Button>
      </div>
      <div className="flex-grow-1 overflow-hidden">
        <ConfigFileRender config={config} />
      </div>
    </div>
  );
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
