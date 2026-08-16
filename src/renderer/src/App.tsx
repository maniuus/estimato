import { useState } from 'react'
import ProjekPage from './pages/ProjekPage'
import RabListPage from './pages/RabListPage'
import RabBuilderPage from './pages/RabBuilderPage'
import ReportPage from './pages/ReportPage'

export type View =
  | { name: 'projek' }
  | { name: 'rab'; projekId: number; projekNama: string }
  | { name: 'builder'; projekId: number; projekNama: string; rabId: number; rabNama: string }
  | { name: 'report'; projekId: number; projekNama: string; rabId: number; rabNama: string }

export default function App() {
  const [view, setView] = useState<View>({ name: 'projek' })

  return (
    <div className="app">
      <header className="hd">
        <div className="hd-main">
          <div className="kicker">[ ESTIMATO ] · SISTEM ESTIMASI BIAYA PEKERJAAN KONSTRUKSI</div>
          <h1>
            ESTIMATO <span className="hl">V2</span>
          </h1>
          <div className="sub">RENCANA ANGGARAN BIAYA · MODULAR REFERENCE</div>
        </div>
        <div className="rev">
          MODUL: <span className="r">RAB</span>
          <br />
          BUILD 0.1.0 © 2026
        </div>
      </header>
      <div className="main">
        <aside className="side">
          <div className="side-title">Navigasi</div>
          <button
            className={'nav' + (view.name === 'projek' ? ' active' : '')}
            onClick={() => setView({ name: 'projek' })}
          >
            Projek
          </button>
          {view.name === 'rab' && (
            <button className="nav active" onClick={() => setView(view)}>
              RAB · {view.projekNama}
            </button>
          )}
          {(view.name === 'builder' || view.name === 'report') && (
            <button
              className={'nav' + (view.name === 'builder' ? ' active' : '')}
              onClick={() =>
                setView({
                  name: 'builder',
                  projekId: view.projekId,
                  projekNama: view.projekNama,
                  rabId: view.rabId,
                  rabNama: view.rabNama
                })
              }
            >
              Builder · {view.rabNama}
            </button>
          )}
          {(view.name === 'builder' || view.name === 'report') && (
            <button
              className={'nav' + (view.name === 'report' ? ' active' : '')}
              onClick={() =>
                setView({
                  name: 'report',
                  projekId: view.projekId,
                  projekNama: view.projekNama,
                  rabId: view.rabId,
                  rabNama: view.rabNama
                })
              }
            >
              Report · {view.rabNama}
            </button>
          )}
        </aside>
        <main className="content">
          {view.name === 'projek' && (
            <ProjekPage onOpen={(p) => setView({ name: 'rab', projekId: p.id, projekNama: p.nama })} />
          )}
          {view.name === 'rab' && (
            <RabListPage
              projekId={view.projekId}
              projekNama={view.projekNama}
              onOpen={(r) =>
                setView({
                  name: 'builder',
                  projekId: view.projekId,
                  projekNama: view.projekNama,
                  rabId: r.id,
                  rabNama: r.nama
                })
              }
              onBack={() => setView({ name: 'projek' })}
            />
          )}
          {view.name === 'builder' && (
            <RabBuilderPage
              rabId={view.rabId}
              rabNama={view.rabNama}
              onBack={() => setView({ name: 'rab', projekId: view.projekId, projekNama: view.projekNama })}
            />
          )}
          {view.name === 'report' && (
            <ReportPage
              projekId={view.projekId}
              projekNama={view.projekNama}
              rabId={view.rabId}
              rabNama={view.rabNama}
              onBack={() => setView({ name: 'rab', projekId: view.projekId, projekNama: view.projekNama })}
            />
          )}
        </main>
      </div>
    </div>
  )
}
