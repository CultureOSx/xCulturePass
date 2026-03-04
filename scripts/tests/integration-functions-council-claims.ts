import assert from 'node:assert/strict';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { app as functionsApp } from '../../functions/src/app';

function normalizeDomain(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return '';
  const noProtocol = raw.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return noProtocol.split('/')[0]?.trim() ?? '';
}

function makeAuthedApp() {
  const wrapper = express();

  wrapper.use((req: Request, _res: Response, next: NextFunction) => {
    const roleHeader = String(req.headers['x-test-role'] ?? 'user');
    const role = roleHeader as
      | 'user'
      | 'organizer'
      | 'business'
      | 'sponsor'
      | 'cityAdmin'
      | 'moderator'
      | 'admin'
      | 'platformAdmin';

    const userId = String(req.headers['x-test-user-id'] ?? `test-${role}`);
    req.user = {
      id: userId,
      username: userId,
      role,
      email: `${userId}@example.com`,
    };
    next();
  });

  wrapper.use(functionsApp);
  return wrapper;
}

async function waitForServer(baseUrl: string): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      // no-op
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('test server did not start in time');
}

function authedHeaders(role: string, userId: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-test-role': role,
    'x-test-user-id': userId,
  };
}

async function run() {
  const app = makeAuthedApp();
  const server = app.listen(0);

  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('unable to determine test server address');
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;
    await waitForServer(baseUrl);

    const councilListRes = await fetch(`${baseUrl}/api/council/list?page=1&pageSize=100`);
    assert.equal(councilListRes.ok, true, 'council list should load');
    const councilList = (await councilListRes.json()) as { councils: Array<{ id: string; websiteUrl?: string; status?: string }> };

    const council = councilList.councils.find((item) => normalizeDomain(item.websiteUrl ?? '').length > 0);
    assert.ok(council, 'at least one council with websiteUrl is required for claim-domain check');

    const councilId = council!.id;
    const councilDomain = normalizeDomain(council!.websiteUrl ?? '');
    assert.ok(councilDomain.length > 0, 'selected council requires a valid domain');

    const claimantA = 'claimant-a';
    const claimantB = 'claimant-b';

    const claimARes = await fetch(`${baseUrl}/api/council/${encodeURIComponent(councilId)}/claim`, {
      method: 'POST',
      headers: authedHeaders('user', claimantA),
      body: JSON.stringify({
        workEmail: `officer@${councilDomain}`,
        roleTitle: 'Community Partnerships Officer',
        note: 'Primary claim submission',
      }),
    });
    assert.equal(claimARes.status, 201, 'first claim should be created');
    const claimA = (await claimARes.json()) as { id: string; status: string; councilId: string; userId: string };
    assert.equal(claimA.status, 'pending_admin_review');
    assert.equal(claimA.councilId, councilId);
    assert.equal(claimA.userId, claimantA);

    const myClaimsPendingRes = await fetch(`${baseUrl}/api/council/${encodeURIComponent(councilId)}/claims/me`, {
      headers: authedHeaders('user', claimantA),
    });
    assert.equal(myClaimsPendingRes.ok, true, 'my claims should load for claimant');
    const myClaimsPending = (await myClaimsPendingRes.json()) as Array<{ id: string; status: string }>;
    assert.ok(myClaimsPending.some((item) => item.id === claimA.id && item.status === 'pending_admin_review'));

    const adminPendingRes = await fetch(`${baseUrl}/api/admin/council/claims?status=pending_admin_review`, {
      headers: authedHeaders('admin', 'admin-reviewer'),
    });
    assert.equal(adminPendingRes.ok, true, 'admin should list pending claims');
    const pendingClaims = (await adminPendingRes.json()) as Array<{ id: string }>;
    assert.ok(pendingClaims.some((item) => item.id === claimA.id));

    const approveRes = await fetch(`${baseUrl}/api/admin/council/claims/${encodeURIComponent(claimA.id)}/approve`, {
      method: 'POST',
      headers: authedHeaders('admin', 'admin-reviewer'),
      body: JSON.stringify({}),
    });
    assert.equal(approveRes.ok, true, 'admin approve should succeed');
    const approvedPayload = (await approveRes.json()) as { success: boolean; claim: { id: string; status: string } };
    assert.equal(approvedPayload.success, true);
    assert.equal(approvedPayload.claim.id, claimA.id);
    assert.equal(approvedPayload.claim.status, 'approved');

    const myClaimsApprovedRes = await fetch(`${baseUrl}/api/council/${encodeURIComponent(councilId)}/claims/me`, {
      headers: authedHeaders('user', claimantA),
    });
    assert.equal(myClaimsApprovedRes.ok, true, 'my claims should load after approval');
    const myClaimsApproved = (await myClaimsApprovedRes.json()) as Array<{ id: string; status: string }>;
    assert.ok(myClaimsApproved.some((item) => item.id === claimA.id && item.status === 'approved'));

    const claimBRes = await fetch(`${baseUrl}/api/council/${encodeURIComponent(councilId)}/claim`, {
      method: 'POST',
      headers: authedHeaders('user', claimantB),
      body: JSON.stringify({
        workEmail: `manager@${councilDomain}`,
        roleTitle: 'Council Program Manager',
        note: 'Secondary claim for reject path',
      }),
    });
    assert.equal(claimBRes.status, 201, 'second claim should be created');
    const claimB = (await claimBRes.json()) as { id: string; status: string };
    assert.equal(claimB.status, 'pending_admin_review');

    const rejectRes = await fetch(`${baseUrl}/api/admin/council/claims/${encodeURIComponent(claimB.id)}/reject`, {
      method: 'POST',
      headers: authedHeaders('admin', 'admin-reviewer'),
      body: JSON.stringify({ reason: 'Insufficient verification context' }),
    });
    assert.equal(rejectRes.ok, true, 'admin reject should succeed');
    const rejectedPayload = (await rejectRes.json()) as { success: boolean; claim: { id: string; status: string; rejectionReason?: string } };
    assert.equal(rejectedPayload.success, true);
    assert.equal(rejectedPayload.claim.id, claimB.id);
    assert.equal(rejectedPayload.claim.status, 'rejected');
    assert.equal(rejectedPayload.claim.rejectionReason, 'Insufficient verification context');

    const sendLetterRes = await fetch(`${baseUrl}/api/admin/council/${encodeURIComponent(councilId)}/send-claim-letter`, {
      method: 'POST',
      headers: authedHeaders('admin', 'admin-reviewer'),
      body: JSON.stringify({ recipientEmail: `contact@${councilDomain}` }),
    });
    assert.equal(sendLetterRes.status, 201, 'send claim letter should succeed');
    const letterPayload = (await sendLetterRes.json()) as {
      success: boolean;
      letter: { councilId: string; recipientEmail: string; claimUrl: string; sentBy: string };
    };
    assert.equal(letterPayload.success, true);
    assert.equal(letterPayload.letter.councilId, councilId);
    assert.equal(letterPayload.letter.recipientEmail, `contact@${councilDomain}`);
    assert.ok(letterPayload.letter.claimUrl.includes('/council/claim?councilId='));
    assert.equal(letterPayload.letter.sentBy, 'admin-reviewer');

    console.log('functions council claim lifecycle checks passed');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
