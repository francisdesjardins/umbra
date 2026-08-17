export { Content } from '@/entities/modal-template/ui/mui/slide-modal/components/Content';
export { DefaultLayout } from '@/entities/modal-template/ui/mui/slide-modal/components/DefaultLayout';
export { MuiSlideFooter as Footer } from '@/entities/modal-template/ui/mui/slide-modal/components/Footer';
export { Header } from '@/entities/modal-template/ui/mui/slide-modal/components/Header';
export { Title } from '@/entities/modal-template/ui/mui/slide-modal/components/Title';

// Namespace object for convenient access: SlideModal.DefaultLayout, etc.
import { Content } from '@/entities/modal-template/ui/mui/slide-modal/components/Content';
import { DefaultLayout } from '@/entities/modal-template/ui/mui/slide-modal/components/DefaultLayout';
import { MuiSlideFooter as Footer } from '@/entities/modal-template/ui/mui/slide-modal/components/Footer';
import { Header } from '@/entities/modal-template/ui/mui/slide-modal/components/Header';
import { Title } from '@/entities/modal-template/ui/mui/slide-modal/components/Title';

export const SlideModal = {
  DefaultLayout,
  Header,
  Title,
  Content,
  Footer,
} as const;
