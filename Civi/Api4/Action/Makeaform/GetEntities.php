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

    foreach ($entities as $name => $entity) {
      $result[] = $entity + ['id' => $name];
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

}
