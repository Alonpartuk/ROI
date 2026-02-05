# Employee Overview Page - UI Component Architecture

## Design System Foundation

The Employee Overview page follows our Design System principles:
- **Atomic Design**: Components built from atoms → molecules → organisms → templates
- **Consistent Spacing**: 8px grid system
- **Color Tokens**: Semantic colors for status, actions, and emphasis
- **Typography Scale**: Modular scale for hierarchy

---

## Page Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            HEADER                                        │
│  ┌──────────┐  ┌─────────────────────────────────────────────────────┐  │
│  │  Avatar  │  │ Name, Title, Department, Status Badge               │  │
│  │          │  │ Location • Manager • Tenure • Quick Actions         │  │
│  └──────────┘  └─────────────────────────────────────────────────────┘  │
├─────────────┬───────────────────────────────────────────────────────────┤
│   SIDEBAR   │                        MAIN CONTENT                        │
│             │  ┌─────────────────────────────────────────────────────┐  │
│  Personal   │  │              TIMELINE VIEW                          │  │
│  ─────────  │  │                                                     │  │
│  Finance    │  │  ● Employment ─────────────────────────────────     │  │
│  ─────────  │  │  ● Salary ─────────────────────────────────────     │  │
│  Equity     │  │  ● Equity ─────────────────────────────────────     │  │
│  ─────────  │  │  ● ...                                              │  │
│  Documents  │  │                                                     │  │
│             │  └─────────────────────────────────────────────────────┘  │
│             │                                                            │
└─────────────┴───────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

### 1. Header Section (`EmployeeHeader`)

**Purpose**: Display vital stats and current status at a glance

```tsx
<EmployeeHeader>
  <Avatar
    src={employee.avatarUrl}
    size="xl"
    status={employee.currentStatus} // green dot for active
  />

  <HeaderContent>
    <NameBlock>
      <DisplayName>{employee.displayName}</DisplayName>
      <Pronouns>{employee.pronouns}</Pronouns>
    </NameBlock>

    <TitleBlock>
      <JobTitle>{employment.jobTitle}</JobTitle>
      <Level badge>{employment.jobLevel}</Level>
    </TitleBlock>

    <MetaRow>
      <LocationBadge icon="map-pin">{location.name}</LocationBadge>
      <DepartmentLink href={...}>{department.name}</DepartmentLink>
      <ManagerLink href={...}>Reports to {manager.displayName}</ManagerLink>
    </MetaRow>

    <StatsRow>
      <Stat label="Tenure" value={formatTenure(tenure)} />
      <Stat label="Employee ID" value={employee.employeeNumber} />
      <Stat label="Start Date" value={formatDate(hireDate)} />
      <StatusBadge status={employee.currentStatus} />
    </StatsRow>
  </HeaderContent>

  <HeaderActions>
    <QuickActionMenu>
      <MenuItem icon="edit">Edit Profile</MenuItem>
      <MenuItem icon="calendar">Schedule Change</MenuItem>
      <MenuItem icon="mail">Send Message</MenuItem>
      <MenuItem icon="download">Export Profile</MenuItem>
    </QuickActionMenu>
  </HeaderActions>
</EmployeeHeader>
```

**Status Badge Colors**:
- `active` → Green
- `on_leave` → Yellow
- `pending_start` → Blue
- `terminated` → Gray

---

### 2. Sidebar Navigation (`EmployeeSidebar`)

**Purpose**: Navigate between content sections

```tsx
<EmployeeSidebar>
  <NavSection>
    <NavItem
      icon="user"
      label="Personal"
      active={activeSection === 'personal'}
      onClick={() => setSection('personal')}
    />
    <NavItem
      icon="dollar-sign"
      label="Finance"
      active={activeSection === 'finance'}
      badge={hasPendingSalaryChange ? 'Pending' : null}
    />
    <NavItem
      icon="trending-up"
      label="Equity"
      active={activeSection === 'equity'}
      badge={nextVestingDate ? formatDate(nextVestingDate) : null}
    />
    <NavItem
      icon="file-text"
      label="Documents"
      active={activeSection === 'documents'}
      badge={unacknowledgedDocs > 0 ? unacknowledgedDocs : null}
    />
  </NavSection>

  <Divider />

  <NavSection title="Timeline">
    <NavItem icon="clock" label="Full History" />
    <NavItem icon="calendar" label="Scheduled Changes" />
  </NavSection>

  {isHR && (
    <>
      <Divider />
      <NavSection title="HR Actions">
        <NavItem icon="edit-3" label="Edit Employment" />
        <NavItem icon="dollar-sign" label="Adjust Compensation" />
        <NavItem icon="award" label="Grant Equity" />
        <NavItem icon="user-x" label="Offboard" variant="danger" />
      </NavSection>
    </>
  )}
</EmployeeSidebar>
```

---

### 3. Main Content - Timeline View (`EmployeeTimeline`)

**Purpose**: Chronological view of employee's journey in the company

```tsx
<EmployeeTimeline>
  <TimelineHeader>
    <Title>Employee Journey</Title>

    <TimelineFilters>
      <DateRangePicker
        startDate={filterStart}
        endDate={filterEnd}
        onChange={setDateRange}
      />

      <MultiSelect
        label="Event Types"
        options={[
          { value: 'employment', label: 'Employment' },
          { value: 'salary', label: 'Salary' },
          { value: 'equity', label: 'Equity' },
          { value: 'documents', label: 'Documents' },
        ]}
        selected={selectedTypes}
        onChange={setSelectedTypes}
      />

      <Toggle
        label="Show Future"
        checked={showFuture}
        onChange={setShowFuture}
      />
    </TimelineFilters>
  </TimelineHeader>

  <TimelineContent>
    {/* Future Events Section */}
    {showFuture && futureEvents.length > 0 && (
      <TimelineSection variant="future">
        <SectionHeader icon="calendar">Scheduled Changes</SectionHeader>
        {futureEvents.map(event => (
          <TimelineEvent
            key={event.id}
            event={event}
            variant="future"
            onCancel={canCancel ? handleCancel : undefined}
          />
        ))}
      </TimelineSection>
    )}

    {/* Current State Marker */}
    <TimelineNowMarker />

    {/* Past Events */}
    <TimelineSection variant="past">
      {groupEventsByYear(pastEvents).map(({ year, events }) => (
        <TimelineYear key={year} year={year}>
          {events.map(event => (
            <TimelineEvent
              key={event.id}
              event={event}
              variant="past"
            />
          ))}
        </TimelineYear>
      ))}
    </TimelineSection>
  </TimelineContent>
</EmployeeTimeline>
```

---

### 4. Timeline Event Component (`TimelineEvent`)

**Purpose**: Individual event card in the timeline

```tsx
<TimelineEvent event={event} variant="past">
  <EventConnector>
    <EventDot color={getEventColor(event.eventType)} />
    <EventLine />
  </EventConnector>

  <EventCard>
    <EventHeader>
      <EventIcon icon={getEventIcon(event.eventType)} />
      <EventTitle>{event.title}</EventTitle>
      <EventDate>{formatDate(event.eventDate)}</EventDate>
      {variant === 'future' && <Badge variant="info">Scheduled</Badge>}
    </EventHeader>

    <EventBody>
      <EventDescription>{event.description}</EventDescription>

      {/* Event-specific details */}
      {event.eventType === 'salary' && (
        <SalaryChangeDetails
          oldAmount={event.details.oldAmount}
          newAmount={event.details.newAmount}
          currency={event.details.currency}
          reason={event.details.reason}
        />
      )}

      {event.eventType === 'employment' && (
        <EmploymentChangeDetails
          changes={event.details.changes}
        />
      )}

      {event.eventType === 'equity' && (
        <EquityEventDetails
          grantType={event.details.grantType}
          shares={event.details.shares}
          vestingProgress={event.details.vestingProgress}
        />
      )}
    </EventBody>

    {variant === 'future' && onCancel && (
      <EventFooter>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel Change
        </Button>
      </EventFooter>
    )}
  </EventCard>
</TimelineEvent>
```

**Event Colors by Type**:
- `employment` → Blue (#3B82F6)
- `salary` → Green (#10B981)
- `equity` → Purple (#8B5CF6)
- `vesting` → Indigo (#6366F1)
- `document` → Gray (#6B7280)

---

### 5. Section-Specific Views

#### Personal Section (`PersonalSection`)

```tsx
<PersonalSection>
  <Card>
    <CardHeader>Basic Information</CardHeader>
    <CardBody>
      <FieldGrid>
        <Field label="Legal Name">{legalName}</Field>
        <Field label="Preferred Name">{preferredName}</Field>
        <Field label="Date of Birth">{dateOfBirth}</Field>
        <Field label="Personal Email">{personalEmail}</Field>
        <Field label="Phone">{phone}</Field>
      </FieldGrid>
    </CardBody>
  </Card>

  <Card>
    <CardHeader>Employment Details</CardHeader>
    <CardBody>
      <FieldGrid>
        <Field label="Employment Type">{employmentType}</Field>
        <Field label="Work Model">{workModel}</Field>
        <Field label="FTE">{ftePercentage}%</Field>
        <Field label="Weekly Hours">{weeklyHours}</Field>
      </FieldGrid>
    </CardBody>
  </Card>

  <Card>
    <CardHeader>Location Data ({location.code})</CardHeader>
    <CardBody>
      <LocalDataFields location={location} data={localData} />
    </CardBody>
  </Card>
</PersonalSection>
```

#### Finance Section (`FinanceSection`)

```tsx
<FinanceSection>
  <SalaryCard>
    <CurrentSalary
      amount={salary.amount}
      currency={salary.currency}
      frequency={salary.frequency}
      effectiveDate={salary.effectiveDate}
    />

    <SalaryBandComparison comparison={salaryComparison} />
  </SalaryCard>

  <SalaryHistoryChart data={salaryHistory} />

  <SalaryHistoryTable
    records={salaryRecords}
    showReasons={isHR}
  />
</FinanceSection>
```

#### Equity Section (`EquitySection`)

```tsx
<EquitySection>
  <EquitySummaryCards>
    <StatCard
      label="Total Granted"
      value={formatNumber(summary.totalSharesGranted)}
      subtext="shares"
    />
    <StatCard
      label="Vested"
      value={formatNumber(summary.totalSharesVested)}
      subtext={`${vestingPercent}%`}
      color="green"
    />
    <StatCard
      label="Unvested"
      value={formatNumber(summary.totalSharesUnvested)}
      color="yellow"
    />
    <StatCard
      label="Exercisable"
      value={formatNumber(summary.totalSharesExercisable)}
      color="blue"
    />
  </EquitySummaryCards>

  {summary.nextVestingDate && (
    <NextVestingAlert
      date={summary.nextVestingDate}
      shares={summary.nextVestingShares}
    />
  )}

  <GrantsList>
    {grants.map(grant => (
      <GrantCard key={grant.id} grant={grant}>
        <VestingProgressBar progress={grant.vestingProgress} />
        <VestingScheduleCollapsible schedule={grant.vestingSchedule} />
      </GrantCard>
    ))}
  </GrantsList>
</EquitySection>
```

#### Documents Section (`DocumentsSection`)

```tsx
<DocumentsSection>
  <DocumentsHeader>
    <Title>Documents</Title>
    {canUpload && (
      <UploadButton onClick={openUploadModal}>
        Upload Document
      </UploadButton>
    )}
  </DocumentsHeader>

  <DocumentFilters>
    <CategoryFilter
      options={documentCategories}
      selected={selectedCategory}
      onChange={setSelectedCategory}
    />
  </DocumentFilters>

  <DocumentsList>
    {documents.map(doc => (
      <DocumentRow key={doc.id} document={doc}>
        <DocumentIcon type={doc.fileType} />
        <DocumentInfo>
          <DocumentName>{doc.name}</DocumentName>
          <DocumentMeta>
            {doc.category} • {formatDate(doc.uploadedAt)} • {formatBytes(doc.fileSizeBytes)}
          </DocumentMeta>
        </DocumentInfo>
        <DocumentActions>
          {doc.requiresAcknowledgment && !doc.acknowledgedAt && (
            <AcknowledgeButton onClick={() => acknowledge(doc.id)} />
          )}
          <DownloadButton onClick={() => download(doc.id)} />
          {canDelete && <DeleteButton onClick={() => confirmDelete(doc.id)} />}
        </DocumentActions>
        <VisibilityBadge visibility={doc.visibility} />
      </DocumentRow>
    ))}
  </DocumentsList>
</DocumentsSection>
```

---

## State Management

```tsx
// Employee Overview Page State
interface EmployeeOverviewState {
  // Core data
  employee: EmployeeFull | null;
  timeline: EmployeeTimeline | null;

  // UI state
  activeSection: 'personal' | 'finance' | 'equity' | 'documents';
  timelineFilters: {
    startDate: Date | null;
    endDate: Date | null;
    eventTypes: TimelineEventType[];
    showFuture: boolean;
  };

  // Loading states
  isLoading: boolean;
  isTimelineLoading: boolean;

  // Modals
  isUploadModalOpen: boolean;
  isScheduleChangeModalOpen: boolean;
  selectedEvent: TimelineEvent | null;
}

// Custom hook for employee data
function useEmployee(employeeId: string) {
  const [state, dispatch] = useReducer(employeeReducer, initialState);

  // Fetch employee data
  useEffect(() => {
    fetchEmployee(employeeId).then(data =>
      dispatch({ type: 'SET_EMPLOYEE', payload: data })
    );
  }, [employeeId]);

  // Fetch timeline when filters change
  useEffect(() => {
    fetchTimeline(employeeId, state.timelineFilters).then(data =>
      dispatch({ type: 'SET_TIMELINE', payload: data })
    );
  }, [employeeId, state.timelineFilters]);

  return { state, dispatch };
}
```

---

## Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| Desktop (>1024px) | Full sidebar + main content |
| Tablet (768-1024px) | Collapsible sidebar (icon-only) |
| Mobile (<768px) | Bottom navigation, full-width sections |

---

## Accessibility Considerations

1. **Keyboard Navigation**: All interactive elements focusable, timeline navigable with arrow keys
2. **Screen Reader**: Proper ARIA labels for status badges, timeline events announced with context
3. **Color Contrast**: Status colors meet WCAG AA standards
4. **Focus Management**: Modal focus trap, return focus after modal close
5. **Reduced Motion**: Respect `prefers-reduced-motion` for timeline animations
