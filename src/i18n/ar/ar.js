import { mergeTranslations } from 'app/config/merge-translations';

export default mergeTranslations(Object.values(import.meta.glob('./*.json', { import: 'default', eager: true })));
