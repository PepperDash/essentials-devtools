import ScrollToBottom from "react-scroll-to-bottom";
import { Message } from "./DebugConsole";

const ConsoleWindow = ({ filteredItems }: ConsoleWindowProps) => {
  return (
    <ScrollToBottom
      className="table-responsive"
      followButtonClassName="btn btn-sm btn-outline-secondary"
      mode="bottom"
    >
      <table className="table table-sm table-striped table-hover">
        <thead className="bg-body">
          <tr>
            <th>Timestamp</th>
            <th>Key</th>
            <th>Level</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((message, index) => (
            <tr key={index}>
              <td>{message.Timestamp}</td>
              <td>{message.Properties?.Key || "global"}</td>
              <td>{message.Level}</td>
              <td>{message.MessageTemplate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollToBottom>
  );
};

export default ConsoleWindow;

interface ConsoleWindowProps {
  filteredItems: Message[];
}
