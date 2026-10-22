import { D01 } from './domains/d01';
import { D02 } from './domains/d02';
import { D03 } from './domains/d03';
import { D04 } from './domains/d04';
import { D05 } from './domains/d05';
import { D06 } from './domains/d06';
import { D07 } from './domains/d07';
import { D08 } from './domains/d08';
import { D09 } from './domains/d09';
import { D10 } from './domains/d10';
import { D11 } from './domains/d11';
import { D12 } from './domains/d12';
import type { DomainContent } from './types';

// Authored domain batches. Each entry is a complete domain (10 lessons, 50 questions);
// the content report (scripts/content-report.ts) fails the build if any is missing or short.
export const DOMAIN_CONTENT: DomainContent[] = [D01, D02, D03, D04, D05, D06, D07, D08, D09, D10, D11, D12];
