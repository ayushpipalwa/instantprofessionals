import { createHmac, timingSafeEqual } from 'node:crypto';
export function bridgeSignature(secret, path, time, raw) {
  return createHmac('sha256',secret).update('POST\n'+path+'\n'+time+'\n'+raw).digest('hex');
}
export function verifyBridge(secret, path, headers, raw, now=Date.now()) {
  const time=headers['x-payment-time'], signature=headers['x-payment-signature'];
  if (typeof secret!=='string' || secret.length<32 || typeof time!=='string' ||
      !/^\d{13}$/.test(time) || Math.abs(now-Number(time))>300000 ||
      typeof signature!=='string' || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(bridgeSignature(secret,path,time,raw),'hex'));
}
