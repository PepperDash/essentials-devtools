import { useSelector } from 'react-redux';
import { selectRoomId } from './commonUiSelectors';

export const useRoomId = () => {
  return useSelector(selectRoomId);
};