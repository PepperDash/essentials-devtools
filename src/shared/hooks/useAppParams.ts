import { useParams } from 'react-router';

/** Wraps up useParams with a type */
export default function useAppParams() {
  return useParams<AppParams>();
}

type AppParams = {
  appId: string;
};