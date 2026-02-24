<?php
namespace Civi\Api4\Action\Makeaform;

use Civi\Api4\Generic\Result;
use Civi\AfformAdmin\AfformAdminMeta;

/**
 * Get list of available entities for the MakeaForm builder.
 *
 * Returns entities that can be used to create submission forms.
 * Only returns 'primary' type entities (not join entities like Address, Email, etc.)
 */
class GetEntities extends \Civi\Api4\Generic\AbstractAction {

  public function _run(Result $result) {
    $entities = $this->getEntities();
    $joins = $this->getJoinEntities();

    foreach ($entities as $name => $entity) {
      // Add available joins for this entity type
      $entityJoins = $joins[$name] ?? [];
      // Contact subtypes inherit Contact's joins
      if (empty($entityJoins) && in_array($name, ['Individual', 'Organization', 'Household'])) {
        $entityJoins = $joins['Contact'] ?? [];
      }
      $result[] = $entity + ['id' => $name, 'joins' => $entityJoins];
    }
  }

  /**
   * Get list of entities from Afform's metadata
   *
   * Only returns 'primary' type entities that are suitable for creating
   * standalone submission forms. Excludes 'join' entities which are for
   * sub-records (Address, Email, Phone, etc.)
   */
  protected function getEntities(): array {
    // Use Afform's metadata which includes the proper list of supported entities
    $afformMeta = AfformAdminMeta::getMetadata();
    $entities = $afformMeta['entities'] ?? [];

    // Define sort order for common entities (others will be sorted alphabetically after)
    $sortOrder = [
      'Individual' => 1,
      'Organization' => 2,
      'Household' => 3,
      'Activity' => 4,
      'Event' => 5,
      'Membership' => 6,
      'Participant' => 7,
      'Contribution' => 8,
      'Case' => 9,
      'Relationship' => 10,
    ];

    $entityMap = [];
    foreach ($entities as $name => $entity) {
      // Skip the special '*' content block entry
      if ($name === '*') {
        continue;
      }

      // Only include 'primary' type entities for form building
      // Skip 'join' entities (Address, Email, Phone, Website, IM, LocBlock)
      $entityType = $entity['type'] ?? 'primary';
      if ($entityType !== 'primary') {
        continue;
      }

      $entityMap[$name] = [
        'name' => $entity['entity'] ?? $name,
        'title' => $entity['label'] ?? $name,
        'icon' => $entity['icon'] ?? NULL,
        'type' => $entityType,
        'sort_order' => $sortOrder[$name] ?? 100,
        'defaults' => $entity['defaults'] ?? NULL,
        'boilerplate' => $entity['boilerplate'] ?? NULL,
      ];
    }

    // Sort by sort_order then alphabetically by title
    uasort($entityMap, function($a, $b) {
      if ($a['sort_order'] !== $b['sort_order']) {
        return $a['sort_order'] <=> $b['sort_order'];
      }
      return strcasecmp($a['title'], $b['title']);
    });

    return $entityMap;
  }

  /**
   * Get available join entities grouped by parent entity type.
   *
   * Join entities are sub-records that can be added to a form alongside
   * the parent entity (e.g., Email, Phone for Contact entities).
   */
  protected function getJoinEntities(): array {
    $afformMeta = AfformAdminMeta::getMetadata();
    $entities = $afformMeta['entities'] ?? [];

    // Collect all primary entity names for matching
    $primaryEntities = [];
    foreach ($entities as $name => $entity) {
      if ($name !== '*' && ($entity['type'] ?? 'primary') === 'primary') {
        $primaryEntities[] = $entity['entity'] ?? $name;
      }
    }

    $joins = [];

    foreach ($entities as $name => $entity) {
      $entityType = $entity['type'] ?? 'primary';
      if ($entityType !== 'join') {
        continue;
      }

      // Dynamically discover parent entities via foreign key fields
      $parentEntities = [];
      try {
        $fields = civicrm_api4($name, 'getFields', [
          'checkPermissions' => FALSE,
          'action' => 'create',
          'select' => ['name', 'fk_entity'],
          'where' => [['fk_entity', 'IS NOT NULL']],
        ]);
        foreach ($fields as $field) {
          $fkEntity = $field['fk_entity'];
          if (in_array($fkEntity, $primaryEntities) || $fkEntity === 'Contact') {
            $parentEntities[] = $fkEntity;
          }
        }
      }
      catch (\Exception $e) {
        // If getFields fails, skip this join entity
        continue;
      }

      $parentEntities = array_unique($parentEntities);

      foreach ($parentEntities as $parent) {
        if (!isset($joins[$parent])) {
          $joins[$parent] = [];
        }
        $joins[$parent][] = [
          'name' => $name,
          'label' => $entity['label'] ?? $name,
          'icon' => $entity['icon'] ?? NULL,
        ];
      }
    }

    return $joins;
  }

}
