import { expiringPlans, markReminder, sendPatientPush } from '../_lib/push.js'

type Request = { method?: string; headers: Record<string, string | string[] | undefined> }
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'NO_AUTORIZADO' })
  try {
    const reminders = await expiringPlans()
    let sent = 0
    for (const reminder of reminders) {
      const result = await sendPatientPush(reminder.paciente_id, {
        title: 'Tu plan vence pronto',
        body: `Tu plan vence el ${reminder.fecha_fin}. Agenda tu próxima consulta para continuar.`,
        tag: `vence-${reminder.plan_id}-${reminder.dias}`,
        url: '/perfil',
      })
      if (result.sent > 0) {
        await markReminder(reminder.plan_id, reminder.dias)
        sent += result.sent
      }
    }
    return res.status(200).json({ ok: true, reminders: reminders.length, sent })
  } catch (error) {
    console.error('NutriPlan reminder error', error)
    return res.status(500).json({ error: 'ERROR_RECORDATORIOS' })
  }
}
