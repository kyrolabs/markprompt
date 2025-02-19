import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SupabaseClient } from '@supabase/auth-helpers-react';
import type { NextApiRequest, NextApiResponse } from 'next';

import { generateRandomSlug } from '@/lib/utils';
import { Database } from '@/types/supabase';
import { Team } from '@/types/types';

import { isProjectSlugAvailable } from './is-project-slug-available';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | string;

const allowedMethods = ['POST'];

export const getAvailableProjectSlug = async (
  supabase: SupabaseClient,
  teamId: Team['id'],
  baseSlug: string | undefined,
) => {
  // If no slug is provided, generate a random one
  let candidateSlug: string;
  if (baseSlug) {
    candidateSlug = baseSlug;
  } else {
    candidateSlug = generateRandomSlug();
  }

  let attempt = 0;
  let isAvailable = false;

  while (!isAvailable) {
    isAvailable = await isProjectSlugAvailable(supabase, teamId, candidateSlug);
    attempt++;
    candidateSlug = `${baseSlug}-${attempt}`;
  }

  return candidateSlug;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = createServerSupabaseClient<Database>({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const candidate = req.body.candidate;
  const teamId = req.body.teamId;
  const slug = await getAvailableProjectSlug(supabase, teamId, candidate);

  return res.status(200).json(slug);
}
