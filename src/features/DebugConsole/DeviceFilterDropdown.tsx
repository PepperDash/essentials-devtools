import { ChangeEvent, useState } from 'react';
import { Badge } from 'react-bootstrap';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import { IconDarkChevronDown } from '../../shared/icons';
import { IdLabel } from '../../shared/types/IdLabel';
import {
  selectCheckedDevices,
  selectDeviceLevels,
} from '../../store/debugConsole/debugConsoleSelectors';
import { debugConsoleActions } from '../../store/debugConsole/debugConsoleSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logLevelOpts } from './debugConsts';

interface DeviceFilterDropdownProps {
  items: IdLabel[];
}

export const DeviceFilterDropdown = ({ items }: DeviceFilterDropdownProps) => {
  const dispatch = useAppDispatch();
  const checkedDevices = useAppSelector(selectCheckedDevices);
  const deviceLevels = useAppSelector(selectDeviceLevels);
  const [openLevelDropdowns, setOpenLevelDropdowns] = useState<Record<string, boolean>>({});

  function handleCheckChange(
    event: ChangeEvent<HTMLInputElement>,
    deviceId: string
  ) {
    if (event.target.checked) {
      dispatch(debugConsoleActions.checkDevice(deviceId));
    } else {
      dispatch(debugConsoleActions.uncheckDevice(deviceId));
    }
  }

  function handleLevelChange(deviceId: string, level: string) {
    dispatch(debugConsoleActions.setDeviceLevel({ deviceId, level }));
    setOpenLevelDropdowns((prev) => ({ ...prev, [deviceId]: false }));
  }

  return (
    <Dropdown className="d-inline-block">
      <Dropdown.Toggle variant="outline" className="py-1" id="device-filter-dropdown">
        Devices
        {checkedDevices.length > 0 && (
          <Badge pill bg="primary" className="ms-1">
            {checkedDevices.length}
          </Badge>
        )}
        <IconDarkChevronDown className="ms-1" />
      </Dropdown.Toggle>

      <Dropdown.Menu className="scroll-dropdown shadow">
        {items.map((item) => {
          const stringId = item.id.toString();
          const isChecked = checkedDevices.includes(stringId);
          const currentLevel = deviceLevels[stringId] ?? 'Information';

          return (
            <Dropdown.Item
              key={stringId}
              as="div"
              className="d-flex align-items-center gap-2 px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Form.Check
                type="checkbox"
                id={`device-check-${stringId}`}
                label={`${item.label} (${stringId})`}
                checked={isChecked}
                onChange={(e) => handleCheckChange(e, stringId)}
                className="flex-grow-1 m-0"
              />
              {isChecked && (
                <Dropdown
                  show={openLevelDropdowns[stringId] ?? false}
                  onToggle={(isOpen) =>
                    setOpenLevelDropdowns((prev) => ({ ...prev, [stringId]: isOpen }))
                  }
                  className="ms-auto"
                >
                  <Dropdown.Toggle
                    variant="outline-secondary"
                    size="sm"
                    id={`level-toggle-${stringId}`}
                    className="py-0 px-2"
                  >
                    {currentLevel}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="shadow">
                    {logLevelOpts.map((opt) => (
                      <Dropdown.Item
                        key={opt.id}
                        active={opt.id === currentLevel}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLevelChange(stringId, opt.id.toString());
                        }}
                      >
                        {opt.label}
                      </Dropdown.Item>
                    ))}                  </Dropdown.Menu>
                </Dropdown>
              )}
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
};
