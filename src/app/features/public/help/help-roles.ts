import { TabOption } from '../../../shared/components/tabs/tabs';
import { HelpRoleFilter } from './help.content';

export const ROLE_OPTIONS: readonly TabOption<HelpRoleFilter>[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'cedente', label: 'Cedente' },
  { value: 'comercio', label: 'Comercio' },
];
