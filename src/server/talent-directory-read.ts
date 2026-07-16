import { isBoardApiError } from '@cavuno/board';

export type TalentDirectoryReadResult<T> =
  | { status: 'available'; page: T }
  | { status: 'restricted' };

/** Convert the expected employer gate before crossing the server-fn boundary. */
export async function readTalentDirectory<T>(
  read: () => Promise<T>,
): Promise<TalentDirectoryReadResult<T>> {
  try {
    return { status: 'available', page: await read() };
  } catch (error) {
    if (
      isBoardApiError(error) &&
      error.status === 403 &&
      error.code === 'talent_directory_restricted'
    ) {
      return { status: 'restricted' };
    }
    throw error;
  }
}
