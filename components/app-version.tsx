import { version } from '../package.json';

export default function AppVersion() {
  return <small className="app-version" aria-label={`App version ${version}`}>v{version}</small>;
}
