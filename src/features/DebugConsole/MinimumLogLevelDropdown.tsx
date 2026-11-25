import { skipToken } from '@reduxjs/toolkit/query';
import { Dropdown } from 'react-bootstrap';
import useAppParams from '../../shared/hooks/useAppParams';
import { IconDarkChevronDown } from '../../shared/icons';
import {
  useGetMinimumLogLevelQuery,
  useSetMinimumLogLevelMutation,
} from '../../store/apiSlice';

const MinimumLogLevelDropdown = () => {
  const { appId } = useAppParams();
  const { data: currentLogLevel } = useGetMinimumLogLevelQuery(
    appId ? { appId } : skipToken
  );

  const [setLogLevel] = useSetMinimumLogLevelMutation();

  if (!currentLogLevel || !appId) return null;

  return (
    <Dropdown>
      <Dropdown.Toggle
        variant="light"
        size="sm"
        className="toolbar-btn"
        title="Minimum log level"
      >
        <span className="toolbar-btn-caption">Level</span>
        {currentLogLevel.minimumLevel}
        <IconDarkChevronDown />
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow">
        <Dropdown.Item
          onClick={() => {
            void setLogLevel({ appId, minimumLevel: 'Information' });
          }}
        >
          Information
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            void setLogLevel({ appId, minimumLevel: 'Warning' });
          }}
        >
          Warning
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            void setLogLevel({ appId, minimumLevel: 'Error' });
          }}
        >
          Error
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            void setLogLevel({ appId, minimumLevel: 'Fatal' });
          }}
        >
          Fatal
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            void setLogLevel({ appId, minimumLevel: 'Debug' });
          }}
        >
          Debug
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            void setLogLevel({ appId, minimumLevel: 'Verbose' });
          }}
        >
          Verbose
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default MinimumLogLevelDropdown;
