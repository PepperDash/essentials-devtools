import { useParams } from 'react-router-dom';

/** Wraps up useParams with a type */
export default function useAppParams() {
  return useParams<AppParams>();
}

type AppParams = {
  appId: string;
};