import { skipToken } from '@reduxjs/toolkit/query';
import { Dropdown } from "react-bootstrap";
import useAppParams from '../../shared/hooks/useAppParams';
import { IconDarkChevronDown } from '../../shared/icons';
import {
  useGetMinimumLogLevelQuery,
  useSetMinimumLogLevelMutation,
} from "../../store/apiSlice";

const MinimumLogLevelDropdown = () => {
  const { appId } = useAppParams();
  const { data: currentLogLevel } = useGetMinimumLogLevelQuery(appId ? { appId } : skipToken);

  const [setLogLevel] = useSetMinimumLogLevelMutation();

  if (!currentLogLevel || !appId) return null;

  return (
    <Dropdown>
      <Dropdown.Toggle
        variant="link"
        className="d-flex align-items-center gap-1 text-reset text-decoration-none py-0"
      >
        {currentLogLevel.minimumLevel}
        <IconDarkChevronDown />
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow">
        <Dropdown.Item
          onClick={() => {
            setLogLevel({ appId, minimumLevel: "Information" });
          }}
        >
          Information
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel({ appId, minimumLevel: "Warning" });
          }}
        >
          Warning
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel({ appId, minimumLevel: "Error" });
          }}
        >
          Error
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel({ appId, minimumLevel: "Fatal" });
          }}
        >
          Fatal
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel({ appId, minimumLevel: "Debug" });
          }}
        >
          Debug
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel({ appId, minimumLevel: "Verbose" });
          }}
        >
          Verbose
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default MinimumLogLevelDropdown;
