import { Dropdown } from "react-bootstrap";
import { IconDarkChevronDown } from '../../shared/icons';
import {
  useGetMinimumLogLevelQuery,
  useSetMinimumLogLevelMutation,
} from "../../store/apiSlice";

const MinimumLogLevelDropdown = () => {
  const { data: currentLogLevel } = useGetMinimumLogLevelQuery();

  const [setLogLevel] = useSetMinimumLogLevelMutation();

  if (!currentLogLevel) return null;

  return (
    <Dropdown>
      <Dropdown.Toggle
        variant="link"
        className="d-flex align-items-center gap-1 text-reset text-decoration-none p-0"
      >
        {currentLogLevel.minimumLevel}
        <IconDarkChevronDown />
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow">
        <Dropdown.Item
          onClick={() => {
            setLogLevel("Information");
          }}
        >
          Information
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel("Warning");
          }}
        >
          Warning
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel("Error");
          }}
        >
          Error
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel("Fatal");
          }}
        >
          Fatal
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel("Debug");
          }}
        >
          Debug
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            setLogLevel("Verbose");
          }}
        >
          Verbose
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default MinimumLogLevelDropdown;
