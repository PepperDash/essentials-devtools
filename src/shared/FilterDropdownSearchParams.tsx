import { ChangeEvent, useEffect, useState } from 'react';
import { Badge } from 'react-bootstrap';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import { useSearchParams } from 'react-router-dom';
import { IdLabel } from './types/IdLabel';
// import { IconDarkChevronDown } from 'shared/icons';

/** */
export const FilterDropdownSearchParams = (
  props: FilterDropdownSearchParamsProps
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [values, setValues] = useState<string[]>([]);

  // React to search params and get the selected values, if any
  useEffect(() => {
    setValues(searchParams.getAll(props.paramName));
  }, [searchParams, props.paramName]);

  // Defined inside here for access to props
  const FilterCheckItem = (checkProps: {
    item: IdLabel ;
    htmlName: string;
    htmlId: string;
  }) => {
    const stringId = checkProps.item.id.toString(); // occasionally numeric id

    function clickItem(event: ChangeEvent<HTMLInputElement>) {
      const newValues = [...values];
      const checked = event.target.checked;
      const foundIndex = values.indexOf(stringId);

      if (checked && foundIndex === -1) {
        newValues.push(stringId);
      } else if (!checked && foundIndex > -1) {
        newValues.splice(foundIndex, 1);
      }
      searchParams.delete(props.paramName);
      newValues.forEach((v) => searchParams.append(props.paramName, v));
      setSearchParams(searchParams);
    }

    return (
      <Form.Check
        type="checkbox"
        className="m-2"
        label={ checkProps.item.id}
        name={checkProps.htmlName}
        id={checkProps.htmlId}
        onChange={clickItem}
        checked={values.includes(stringId)}
      />
    );
  };

  /* MAIN RENDER *************************************************************/
  return (
    <Dropdown className={`d-inline-block ${props.className}`}>
      <Dropdown.Toggle variant="outline" className="py-1" id="dropdown-basic">
        {props.buttonLabel}
        {values.length > 0 && (
          <Badge pill bg="primary" className="ms-1">
            {values.length}
          </Badge>
        )}
        {/* <IconDarkChevronDown className="ms-1" /> */}
      </Dropdown.Toggle>
      <Dropdown.Menu className="scroll-dropdown shadow">
        {props.items.map((item) => (
          <Dropdown.Item
            as={FilterCheckItem}
            key={item.id}
            item={item}
            htmlName={item.id.toString()}
            htmlId={`${props.paramName}-${item.id}`}
          />
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export interface FilterDropdownSearchParamsProps {
  paramName: string;
  buttonLabel: string;
  /** Passed to the Dropdown contained inside */
  className?: string;
  items: IdLabel[];
}
