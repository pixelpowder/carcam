// Auto-merge helper used by all implement endpoints.
// After a PR is created we squash-merge it and delete the branch — the PR
// stays in history for paper trail, but the change goes live without
// manual intervention. Tuned for solo workflows on private repos.

export async function squashMergeAndCleanup({ gh, owner, repo, pullNumber, branch, title }) {
  let merged = false;
  let mergeError = null;
  try {
    await gh.pulls.merge({
      owner, repo, pull_number: pullNumber,
      merge_method: 'squash',
      commit_title: title,
    });
    merged = true;
  } catch (e) {
    // Branch protection, conflicts, or status checks pending — leave the PR
    // open and surface the reason. Common case: status checks "queued/pending".
    mergeError = e.message;
  }

  // Best-effort branch cleanup
  if (merged) {
    try { await gh.git.deleteRef({ owner, repo, ref: `heads/${branch}` }); } catch { /* keep silent */ }
  }

  return { merged, mergeError };
}
