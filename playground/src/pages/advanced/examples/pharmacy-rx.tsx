import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { createImmerStore } from '@/shared/lib/immer-store';
import {
  Box,
  Chip,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  asyncFulfilled,
  asyncIdle,
  asyncPending,
  asyncRejected,
  runAsync,
  type AsyncState,
} from '@/shared/lib/async-state';
import { createMutex } from '@/shared/lib/mutex';
import { safeAwait } from '@/shared/lib/safe-await';
import { createSingleFlight } from '@/shared/lib/single-flight';
import { useMessageModal, useSlideModal } from 'umbra/react';
import { createStoreContext } from '@/shared/lib/create-store-context';
import { useStore } from '@/shared/lib/use-store';
import { watch } from '@/shared/lib/watch';
import { useEffect } from 'react';

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  insuranceProvider: string;
  insuranceNumber: string;
  allergies: string[];
};

type ServiceStatus = 'pending' | 'verified' | 'dispensed' | 'completed';

type Service = {
  id: string;
  drugName: string;
  din: string;
  qty: number;
  dosage: string;
  refills: number;
  status: ServiceStatus;
};

type Prescription = {
  id: string;
  patientId: string;
  prescriber: string;
  dateWritten: string;
  status: 'active' | 'closed';
  services: Service[];
};

const MOCK_PATIENT: Patient = {
  id: 'PAT-001',
  firstName: 'Marie',
  lastName: 'Tremblay',
  dateOfBirth: '1985-03-14',
  insuranceProvider: 'RAMQ',
  insuranceNumber: 'TREM 8503 1412',
  allergies: ['Penicillin', 'Sulfa drugs'],
};

const MOCK_PRESCRIPTION: Prescription = {
  id: 'RX-2024-4781',
  patientId: 'PAT-001',
  prescriber: 'Dr. Jean-Pierre Bouchard',
  dateWritten: '2024-12-15',
  status: 'active',
  services: [
    {
      id: 'SVC-001',
      drugName: 'Amoxicillin 500mg',
      din: '02247429',
      qty: 30,
      dosage: '1 cap TID x 10 days',
      refills: 0,
      status: 'pending',
    },
    {
      id: 'SVC-002',
      drugName: 'Metformin 850mg',
      din: '02229773',
      qty: 90,
      dosage: '1 tab BID',
      refills: 3,
      status: 'pending',
    },
    {
      id: 'SVC-003',
      drugName: 'Lisinopril 10mg',
      din: '02217481',
      qty: 30,
      dosage: '1 tab daily',
      refills: 5,
      status: 'pending',
    },
  ],
};

// Stores declare only the API surface they use — injected at the React boundary.

type PatientApi = {
  fetchPatient(patientId: string): Promise<Patient>;
};

type RxApi = {
  fetchPrescription(rxId: string): Promise<Prescription>;
};

type RxLogger = {
  warn(message: string, data?: Record<string, unknown>): void;
};

type PatientState = { patient: AsyncState<Patient> };

type PatientMethods = {
  load(patientId: string): Promise<void>;
  reset(): void;
};

const mockPatientApi: PatientApi = {
  async fetchPatient(_patientId: string): Promise<Patient> {
    await new Promise<void>((r) => {
      return setTimeout(r, 400);
    });
    return structuredClone(MOCK_PATIENT);
  },
};

// Deduplicates concurrent load() calls — N callers share one fetch.
const patientLoadFlight = createSingleFlight();

const patientStore = createImmerStore<PatientState, PatientMethods, PatientApi>(
  { patient: asyncIdle },
  (api) => {
    return {
      async load(patientId: string): Promise<void> {
        await patientLoadFlight(() => {
          return runAsync(
            () => {
              return api.getContext().fetchPatient(patientId);
            },
            (state) => {
              api.update((d) => {
                d.patient = state;
              });
            }
          );
        });
      },
      reset(): void {
        api.reset();
      },
    };
  },
  // Dependencies are injected where the store is built — a pure, one-time wiring. Injecting
  // them from a component's render would mutate a module-level store during render.
  { context: mockPatientApi }
);

// Cross-store coordination is just a direct method reference — the patient store
// is injected through context so the Rx store stays decoupled from module scope.
type RxContext = {
  api: RxApi;
  logger: RxLogger;
  patient: typeof patientStore;
};

const mockRxApi: RxApi = {
  async fetchPrescription(_rxId: string): Promise<Prescription> {
    await new Promise<void>((r) => {
      return setTimeout(r, 600);
    });
    return structuredClone(MOCK_PRESCRIPTION);
  },
};

const mockLogger: RxLogger = {
  warn(message, data) {
    // oxlint-disable-next-line no-console -- demo mock logger
    console.warn('[rx]', message, data ?? '');
  },
};

const NEXT_STATUS: Readonly<Record<ServiceStatus, ServiceStatus | null>> = {
  pending: 'verified',
  verified: 'dispensed',
  dispensed: 'completed',
  completed: null,
};

const STATUS_ACTION: Readonly<Record<ServiceStatus, string | null>> = {
  pending: 'Verify',
  verified: 'Dispense',
  dispensed: 'Complete',
  completed: null,
};

const STATUS_COLOR: Readonly<Record<ServiceStatus, 'default' | 'info' | 'warning' | 'success'>> = {
  pending: 'default',
  verified: 'info',
  dispensed: 'warning',
  completed: 'success',
};

function canCloseRx(services: Service[]): boolean {
  return (
    services.length > 0 &&
    services.every((s) => {
      return s.status === 'completed';
    })
  );
}

function findService(services: Service[], id: string): Service | undefined {
  return services.find((s) => {
    return s.id === id;
  });
}

// Three-generic store: async state, safeAwait, cross-store coordination.
// Manual transitions used because the fetch result splits across two snapshot fields.

type RxState = {
  prescription: AsyncState<Omit<Prescription, 'services'>>;
  services: Service[];
};

type RxMethods = {
  services: {
    findById(serviceId: string): Service | undefined;
    advanceById(serviceId: string): void;
  };
  load(rxId: string): Promise<void>;
  closeRx(): void;
  reset(): void;
};

const rxLoadMutex = createMutex();

const rxStore = createImmerStore<RxState, RxMethods, RxContext>(
  { prescription: asyncIdle, services: [] },
  (api) => {
    return {
      services: {
        findById(serviceId: string): Service | undefined {
          return findService(api.get().services, serviceId);
        },
        // immer mutates the matched service in place — structural sharing is
        // automatic, so untouched services keep their reference identity.
        advanceById(serviceId: string): void {
          api.update((d) => {
            const svc = d.services.find((s) => {
              return s.id === serviceId;
            });
            if (svc === undefined) {
              return;
            }
            const next = NEXT_STATUS[svc.status];
            if (next !== null) {
              svc.status = next;
            }
          });
        },
      },

      load(rxId: string): Promise<void> {
        return rxLoadMutex(async () => {
          const { api: rxApi, logger, patient } = api.getContext();

          api.update((d) => {
            d.prescription = asyncPending;
          });

          const [rxErr, rx] = await safeAwait(rxApi.fetchPrescription(rxId));
          if (rxErr !== null) {
            logger.warn('Failed to load prescription', { rxId, error: rxErr.message });
            api.update((d) => {
              d.prescription = asyncRejected(rxErr);
            });
            return;
          }

          const { services: incoming, ...rxData } = rx;
          api.update((d) => {
            d.prescription = asyncFulfilled(rxData);
            d.services = incoming;
          });

          await patient.load(rx.patientId);
        });
      },

      closeRx() {
        api.update((d) => {
          if (d.prescription.status === 'fulfilled' && canCloseRx(d.services)) {
            d.prescription.data.status = 'closed';
          }
        });
      },

      reset() {
        api.reset();
        api.getContext().patient.reset();
      },
    };
  },
  { context: { api: mockRxApi, logger: mockLogger, patient: patientStore } }
);

// Ephemeral UI state scoped to this component's lifetime.
const PharmacyUiContext = createStoreContext(
  () => {
    return createImmerStore(
      { result: null as string | null, selectedServiceId: null as string | null },
      (api) => {
        return {
          setResult(result: string | null) {
            api.update((d) => {
              d.result = result;
            });
          },
          setSelectedServiceId(id: string | null) {
            api.update((d) => {
              d.selectedServiceId = id;
            });
          },
          clearSession() {
            api.reset();
          },
        };
      }
    );
  },
  { name: 'PharmacyUi' }
);

export const MODAL_ID = 'pharmacy-rx-slide';

function PharmacyRxContent() {
  const uiStore = PharmacyUiContext.useStoreContext();
  const { result, selectedServiceId } = PharmacyUiContext.useSnapshot();

  useEffect(() => {
    return watch(
      rxStore,
      (s) => {
        return s.services.filter((sv) => {
          return sv.status === 'completed';
        }).length;
      },
      (completedCount) => {
        const { services } = rxStore.getSnapshot();
        if (services.length === 0) {
          return;
        }
        uiStore.setResult(
          completedCount === services.length
            ? 'All services completed — ready to close Rx'
            : `${String(completedCount)}/${String(services.length)} services completed`
        );
      }
    );
  }, [uiStore]);

  const rx = useStore(rxStore);
  const pat = useStore(patientStore);

  // Projections computed inline from snapshots this component already subscribes
  // to — zustand-style, no separate derived stores. React Compiler memoizes them.
  const canClose = canCloseRx(rx.services);
  const selectedService =
    selectedServiceId !== null ? (findService(rx.services, selectedServiceId) ?? null) : null;
  const summary = {
    serviceCount: rx.services.length,
    completedCount: rx.services.filter((s) => {
      return s.status === 'completed';
    }).length,
  };

  const patientModal = useMessageModal<void, 'close'>({
    id: 'pharmacy-patient-detail',
    render: ({ action }) => {
      if (pat.patient.status !== 'fulfilled') {
        return null;
      }
      const p = pat.patient.data;

      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <Typography variant="h6">
              {p.firstName} {p.lastName}
            </Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Stack spacing={1.5}>
              <Typography variant="body2">
                <strong>Date of Birth:</strong> {p.dateOfBirth}
              </Typography>
              <Typography variant="body2">
                <strong>Insurance:</strong> {p.insuranceProvider} — {p.insuranceNumber}
              </Typography>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Allergies
                </Typography>
                {p.allergies.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {p.allergies.map((a) => {
                      return (
                        <Chip key={a} label={a} size="small" color="error" variant="outlined" />
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    None known
                  </Typography>
                )}
              </Box>
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('close')}>
              Close
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const serviceModal = useMessageModal<void, 'advance' | 'close'>({
    id: 'pharmacy-service-detail',
    render: ({ action }) => {
      if (selectedService === null) {
        return null;
      }

      const actionLabel = STATUS_ACTION[selectedService.status];

      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <Typography variant="h6">{selectedService.drugName}</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Stack spacing={1.5}>
              <Typography variant="body2">
                <strong>DIN:</strong> {selectedService.din}
              </Typography>
              <Typography variant="body2">
                <strong>Quantity:</strong> {selectedService.qty}
              </Typography>
              <Typography variant="body2">
                <strong>Dosage:</strong> {selectedService.dosage}
              </Typography>
              <Typography variant="body2">
                <strong>Refills:</strong> {selectedService.refills}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Status:
                </Typography>
                <Chip
                  label={selectedService.status}
                  size="small"
                  color={STATUS_COLOR[selectedService.status]}
                />
              </Box>
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            {actionLabel !== null && (
              <Shared.Button
                variant="contained"
                {...action('advance', (close) => {
                  rxStore.services.advanceById(selectedService.id);
                  close();
                })}
              >
                {actionLabel}
              </Shared.Button>
            )}
            <Shared.Button variant="outlined" {...action('close')}>
              Close
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const rxSlide = useSlideModal<void, 'close' | 'closeRx'>({
    id: MODAL_ID,
    direction: 'right',
    onOpen: async () => {
      uiStore.clearSession();
      await rxStore.load('RX-2024-4781');
    },
    render: ({ isPreparing, direction, action }) => {
      const rxCloseRxProps = action('closeRx', (close) => {
        rxStore.closeRx();
        close();
      });

      return (
        <SlideModal.DefaultLayout direction={direction} sx={{ width: 675 }}>
          <SlideModal.Header>
            <SlideModal.Title>
              {rx.prescription.status === 'fulfilled'
                ? `${rx.prescription.data.id} — ${rx.prescription.data.prescriber}`
                : 'Loading prescription…'}
            </SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            {isPreparing ? (
              <Typography color="text.secondary">Loading prescription…</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pat.patient.status === 'fulfilled' && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.5,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Link
                        component="button"
                        variant="subtitle2"
                        underline="hover"
                        onClick={async () => {
                          await patientModal.open();
                        }}
                      >
                        {pat.patient.data.firstName} {pat.patient.data.lastName}
                      </Link>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        DOB: {pat.patient.data.dateOfBirth} · {pat.patient.data.insuranceProvider}
                      </Typography>
                    </Box>
                    {pat.patient.data.allergies.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {pat.patient.data.allergies.map((a) => {
                          return (
                            <Chip key={a} label={a} size="small" color="error" variant="outlined" />
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                )}

                {rx.prescription.status === 'fulfilled' && (
                  <Typography variant="caption" color="text.secondary">
                    Written: {rx.prescription.data.dateWritten} · Status:{' '}
                    <strong>{rx.prescription.data.status}</strong> · Progress:{' '}
                    {summary.completedCount}/{summary.serviceCount} completed
                  </Typography>
                )}

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Drug</TableCell>
                        <TableCell>DIN</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell>Dosage</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rx.services.map((svc) => {
                        const actionLabel = STATUS_ACTION[svc.status];
                        return (
                          <TableRow
                            key={svc.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={async () => {
                              uiStore.setSelectedServiceId(svc.id);
                              await serviceModal.open();
                            }}
                          >
                            <TableCell>{svc.drugName}</TableCell>
                            <TableCell>{svc.din}</TableCell>
                            <TableCell align="right">{svc.qty}</TableCell>
                            <TableCell>{svc.dosage}</TableCell>
                            <TableCell>
                              <Chip
                                label={svc.status}
                                size="small"
                                color={STATUS_COLOR[svc.status]}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {actionLabel !== null && (
                                <Shared.Button
                                  variant="outlined"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rxStore.services.advanceById(svc.id);
                                  }}
                                >
                                  {actionLabel}
                                </Shared.Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </SlideModal.Content>
          <SlideModal.Footer justify="space-between">
            <Shared.Button variant="outlined" {...action('close')}>
              Close Panel
            </Shared.Button>
            <Shared.Button
              {...rxCloseRxProps}
              variant="contained"
              color="success"
              disabled={rxCloseRxProps.disabled || !canClose}
            >
              Close Rx
            </Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
    onClose: () => {
      rxStore.reset();
    },
  });

  return (
    <ExampleLayout
      result={result}
      modals={
        <>
          {patientModal.Modal}
          {serviceModal.Modal}
          {rxSlide.Modal}
        </>
      }
    >
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          await rxSlide.open();
          const [, closeResult] = await rxSlide.waitForClose();
          if (closeResult?.reason === 'closeRx') {
            uiStore.setResult('Prescription closed — all services completed');
          } else {
            uiStore.setResult(`Panel dismissed: ${closeResult?.reason ?? 'unknown'}`);
          }
        }}
      >
        View Prescription
      </Shared.Button>
    </ExampleLayout>
  );
}

export function PharmacyRxExample() {
  return (
    <PharmacyUiContext.Provider>
      <PharmacyRxContent />
    </PharmacyUiContext.Provider>
  );
}
