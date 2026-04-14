import { skipToken } from "@reduxjs/toolkit/query";
import { useState } from "react";
import useAppParams from "../shared/hooks/useAppParams";
import {
  EssentialsException,
  useGetInitializationExceptionsQuery,
} from "../store/apiSlice";

const InitializationExceptions = () => {
  const { appId } = useAppParams();
  const { data, isLoading, isError } = useGetInitializationExceptionsQuery(
    appId ? { appId } : skipToken,
  );

  console.log("Initialization exceptions:", data?.Exceptions);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (isLoading) return <div className="p-3">Loading…</div>;
  if (isError)
    return (
      <div className="p-3 text-danger">
        Failed to load initialization exceptions.
      </div>
    );

  if (!data || data.Exceptions.length === 0) {
    return (
      <div className="p-3 text-success">
        No initialization exceptions reported.
      </div>
    );
  }

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <h2 className="mb-2">Initialization Exceptions</h2>
      <div className="overflow-auto flex-grow-1">
        <table className="table table-striped table-hover align-middle mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th style={{ width: "2rem" }}>#</th>
              <th>Message</th>
              <th style={{ width: "8rem" }}>Stack trace</th>
            </tr>
          </thead>
          <tbody>
            {data.Exceptions.map((ex: EssentialsException, idx: number) => {
              const isExpanded = expandedIndex === idx;
              return (
                <>
                  <tr key={`ex-${idx}`}>
                    <td className="text-muted">{idx + 1}</td>
                    <td>
                      <span className="text-danger fw-semibold">
                        {ex.Message}
                      </span>
                    </td>
                    <td>
                      {ex.StackTrace && (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() =>
                            setExpandedIndex(isExpanded ? null : idx)
                          }
                        >
                          {isExpanded ? "Hide" : "Show"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && ex.StackTrace && (
                    <tr key={`ex-${idx}-trace`}>
                      <td colSpan={3} className="p-0">
                        <pre
                          className="m-0 p-3 bg-light text-muted"
                          style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap" }}
                        >
                          {ex.StackTrace}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InitializationExceptions;
