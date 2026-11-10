import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

import 'dayjs/locale/en';
import 'dayjs/locale/ar-ly';

dayjs.extend(customParseFormat);
dayjs.extend(duration);
dayjs.extend(relativeTime);
