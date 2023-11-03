/**
 * Use to insert a "1-spacer-unit" gap in a row. Does this by rendering a td (default)  or th
 * cell, removing top, bottom and end padding. colSpan can be used to
 * span columns. Use ps-* classes to modify width
 */
export const TableCellSpacer = ({
  as: As = 'td',
  colSpan: colspan = 1,
  /** Use ps-* classes to modify width */
  className = '',
}: TableCellSpacerProps) => {
  return <As className={`py-0 pe-0 ${className}`} colSpan={colspan} />;
};

interface TableCellSpacerProps {
  /** Defaults to td element */
  as?: 'td' | 'th';
  colSpan?: number;
  className?: string;
}
