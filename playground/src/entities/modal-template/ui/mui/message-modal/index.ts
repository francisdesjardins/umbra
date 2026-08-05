// Namespace components for composition
// Namespace components for composition
// Namespace components for composition
// Namespace components for composition
export { Content } from '@/entities/modal-template/ui/mui/message-modal/components/Content';
export { DefaultContainer } from '@/entities/modal-template/ui/mui/message-modal/components/DefaultContainer';
export { DefaultLayout } from '@/entities/modal-template/ui/mui/message-modal/components/DefaultLayout';
export { Footer } from '@/entities/modal-template/ui/mui/message-modal/components/Footer';
export { Header } from '@/entities/modal-template/ui/mui/message-modal/components/Header';
export { Icon } from '@/entities/modal-template/ui/mui/message-modal/components/Icon';
export { Title } from '@/entities/modal-template/ui/mui/message-modal/components/Title';

// Namespace object for convenient access: MessageModal.DefaultLayout, etc.
import { Content } from '@/entities/modal-template/ui/mui/message-modal/components/Content';
import { DefaultContainer } from '@/entities/modal-template/ui/mui/message-modal/components/DefaultContainer';
import { DefaultLayout } from '@/entities/modal-template/ui/mui/message-modal/components/DefaultLayout';
import { Footer } from '@/entities/modal-template/ui/mui/message-modal/components/Footer';
import { Header } from '@/entities/modal-template/ui/mui/message-modal/components/Header';
import { Icon } from '@/entities/modal-template/ui/mui/message-modal/components/Icon';
import { Title } from '@/entities/modal-template/ui/mui/message-modal/components/Title';

export const MessageModal = {
  DefaultContainer,
  DefaultLayout,
  Title,
  Content,
  Header,
  Icon,
  Footer,
} as const;
